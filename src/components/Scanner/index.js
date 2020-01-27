import React, { Component } from "react"

import './index.css'
const cv = require("./opencv.js");

class Scanner extends Component
{   

    constructor(props)
    {
        super(props)

        this.state = {
            openCvReady: false
        }

        cv['onRuntimeInitialized']=()=>{
            this.setState({openCvReady: true});
        };
    }   

    render()
    {
        return(<div id="scannerContainer"> 
                    <h4 id="status">{this.state.openCvReady ? "Listo" : "Cargando"}</h4>
                    {                        
                        <div className={this.state.openCvReady ? "" : "hidden"}>
                            <div className="caption"><input type="file" id="fileInput" name="file" accept="image/*"/></div>
                            <img id="imageSrc" alt="" className="hidden" />
                            <div id="canvasContainer">
                                <canvas id="canvasOutput"/>
                                <canvas id="canvasZoom" width="200" height="200"></canvas>
                            </div>

                            <div><button id="btnApply" type="button" onClick={() => applyTransform()}>Aplicar</button></div>
                            <div><button id="btnRotate" className="hidden" type="button" onClick={() => rotateCanvas()}>Rotar</button></div>
                        </div>
                    }
               </div>
        )
    }

    
}


window.mobileCheck = function() {
    var check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
    return check;
  };


let perspectiveWidth, perspectiveHeight, origin, originRes, tl, tr, bl, br, mat, canvas, zoom, ctx, zoomCtx, canvasRect, canvasWidth, canvasHeight, ratio;
let squareTL, squareTR, squareBL, squareBR; //Coordenadas de las esquinas
let renderSquares = true;//Controla si se muestra la caja de recorte
let isLandscape = true; //Indica si la foto ha sido hecha en vertical u horizontal
let orientationCode = 1;//Indica la orientación de la imagen basado en EXIF (http://www.daveperrett.com/images/articles/2012-07-28-exif-orientation-handling-is-a-ghetto/EXIF_Orientations.jpg)


const lineColor = '#005400';
let SIZE =  window.mobileCheck() ? 70 : 20;
const IMAGE_SHORT = 720;
const IMAGE_LONG = 1280;

var dragData = {
    draggables: [],
    start: { x: 0, y: 0 },
    current: { x: 0, y: 0},
    target: null
};

document.addEventListener("DOMContentLoaded", function(event) 
{

    let imgElement = document.getElementById("imageSrc")
    let inputElement = document.getElementById("fileInput");
    canvas = document.getElementById("canvasOutput");    
    zoom = document.getElementById("canvasZoom");    

    inputElement.addEventListener("change", (e) => 
    {        
        if(e.target.files[0])
        {
            console.log(e.target.files[0]);
            imgElement.src = URL.createObjectURL(e.target.files[0]);
            getOrientation(e.target.files[0], function(orientation)
            {
                orientationCode = orientation;
                console.log("orientation code: " + orientationCode)
                isLandscape = orientationCode === 1 || orientationCode === 2 || orientationCode === 3 || orientationCode === 4;
            })
        }

    }, false);

    imgElement.onload = function() 
    {
        mat = cv.imread(imgElement);
        findContours(mat);
    };


   
    

});

function run()
{
    var loop = function () {
        requestAnimationFrame(loop);
        update();
        render();
    }
    loop();
}

function update() {

}

function render()
{
    cv.imshow('canvasOutput', originRes);
    let s = getComputedStyle(canvas);
    canvasWidth = s.width;
    canvasWidth = canvasWidth.split('px')[0];
    canvasHeight = s.height;
    canvasHeight = canvasHeight.split('px')[0];

    if(renderSquares)
    {
        //Linea de TL a BL
        ctx.beginPath();
        ctx.moveTo(squareTL.x + SIZE/2, squareTL.y + SIZE/2);
        ctx.lineTo(squareBL.x + SIZE/2, squareBL.y + SIZE/2);
        ctx.strokeStyle = lineColor;
        ctx.stroke();

        //Linea de TL a TR
        ctx.beginPath();
        ctx.moveTo(squareTL.x + SIZE/2, squareTL.y + SIZE/2);
        ctx.lineTo(squareTR.x + SIZE/2, squareTR.y + SIZE/2);
        ctx.strokeStyle = lineColor;
        ctx.stroke();

        //Linea de TR a BR
        ctx.beginPath();
        ctx.moveTo(squareTR.x + SIZE/2, squareTR.y + SIZE/2);
        ctx.lineTo(squareBR.x + SIZE/2, squareBR.y + SIZE/2);
        ctx.strokeStyle = lineColor;
        ctx.stroke();

        //Linea de BL a BR
        ctx.beginPath();
        ctx.moveTo(squareBL.x + SIZE/2, squareBL.y + SIZE/2);
        ctx.lineTo(squareBR.x + SIZE/2, squareBR.y + SIZE/2);
        ctx.strokeStyle = lineColor;
        ctx.stroke();

        squareTL.draw(ctx);            
        squareTR.draw(ctx);
        squareBL.draw(ctx);
        squareBR.draw(ctx);
        
    }
}

function createSquares(tl, tr, bl, br)
{
    dragData.draggables = [];
    squareTL = new Square(tl.corner.x - SIZE/2, tl.corner.y - SIZE/2, SIZE, SIZE);
    squareTR = new Square(tr.corner.x - SIZE/2, tr.corner.y - SIZE/2, SIZE, SIZE);
    squareBL = new Square(bl.corner.x - SIZE/2, bl.corner.y - SIZE/2, SIZE, SIZE);
    squareBR = new Square(br.corner.x - SIZE/2, br.corner.y - SIZE/2, SIZE, SIZE);
    dragData.draggables.push(squareTL, squareTR, squareBL, squareBR);
    
}

function Square(x, y, w, h)
{
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
}

Square.prototype = {
    update: function () {

    },
    draw: function (ctx) {
        ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.fillRect(this.x, this.y, this.w, this.h);
    },
    isPointInside: function (x, y) {
        return (x >= this.x) && (x < this.x + this.w) && (y > this.y) && (y < this.y + this.h);
    }
}    

var pointerCoords = {
    x: 0,
    y: 0,
    update: function (e) {
        var coords = e.touches ? e.touches[0] : e;
        this.x = (coords.pageX - canvasRect.left);
        this.y = (coords.pageY - canvasRect.top);
        //console.log("canvas rect: ", canvasRect);
    }

};

function findContours(mat)
{

    renderSquares = true;
   
    //document.getElementById("btnApply").disabled = false;
    document.getElementById("btnApply").classList.remove('hidden');
    document.getElementById("btnRotate").classList.add('hidden');

    let dst = new cv.Mat();
    let dstRes = new cv.Mat();
    origin = mat.clone();

    console.log("isLandscape: " + isLandscape);

    
    /*if(!isLandscape)
    {
        cv.transpose(origin, origin);
        cv.flip(origin, origin, 2);
    }*/

    originRes = new cv.Mat();
    
    let resize =  new cv.Size(IMAGE_LONG, IMAGE_SHORT)//isLandscape ? new cv.Size(IMAGE_LONG, IMAGE_SHORT) : new cv.Size(IMAGE_SHORT, IMAGE_LONG);
    cv.resize(origin, originRes, resize, 0, 0, cv.INTER_AREA);
    
    
    //Aplicamos filtros para facilitar la búsqueda de contornos        
    cv.cvtColor(mat, dst, cv.COLOR_RGB2GRAY);
    let ksize = new cv.Size(5, 5);
    cv.GaussianBlur(dst, dst, ksize, 0, 0, cv.BORDER_DEFAULT);
    cv.Canny(dst, dst, 50, 100, 3, true);

    cv.resize(dst, dstRes, resize, 0, 0, cv.INTER_AREA);

    /*if(!isLandscape)
    {
        cv.transpose(dstRes, dstRes);
        cv.flip(dstRes, dstRes, 2);
    }*/

    //Buscamos todos los contornos
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(dstRes, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    //Buscamos el contorno con mayor superficie
    let sortableContours = [];
    for (let i = 0; i < contours.size(); i++) 
    {
        let contour = contours.get(i);
        let areaSize = cv.contourArea(contour, false);
        let perimiterSize = cv.arcLength(contour, false);

        sortableContours.push({ areaSize, perimiterSize, contour });
    }                

    //Ordenamos los contornos
    sortableContours = sortableContours.sort((item1, item2) => { 
        return (item1.areaSize > item2.areaSize) ? -1 : (item1.areaSize < item2.areaSize) ? 1 : 0; 
    }).slice(0, 5);


    //Nos aseguramos que el area más grande tiene 4 esquinas
    let approx = new cv.Mat();
    cv.approxPolyDP(sortableContours[0].contour, approx, .05 * sortableContours[0].perimiterSize, true);                

    if (approx.rows === 4) 
    {
        console.log('Found a 4-corner');
        let foundContour = approx;

        //Find the corners
        //foundCountour has 2 channels (seemingly x/y), has a depth of 4, and a type of 12.  Seems to show it's a CV_32S "type", so the valid data is in data32S??
        let corner1 = new cv.Point(foundContour.data32S[0], foundContour.data32S[1]);
        let corner2 = new cv.Point(foundContour.data32S[2], foundContour.data32S[3]);
        let corner3 = new cv.Point(foundContour.data32S[4], foundContour.data32S[5]);
        let corner4 = new cv.Point(foundContour.data32S[6], foundContour.data32S[7]);

        //Order the corners
        let cornerArray = [{ corner: corner1 }, { corner: corner2 }, { corner: corner3 }, { corner: corner4 }];
        //Sort by Y position (to get top-down)
        cornerArray.sort((item1, item2) => { return (item1.corner.y < item2.corner.y) ? -1 : (item1.corner.y > item2.corner.y) ? 1 : 0; }).slice(0, 5);


        //Determinamos que punto equivale a cada esquina
        tl = cornerArray[0].corner.x < cornerArray[1].corner.x ? cornerArray[0] : cornerArray[1];
        tr = cornerArray[0].corner.x > cornerArray[1].corner.x ? cornerArray[0] : cornerArray[1];
        bl = cornerArray[2].corner.x < cornerArray[3].corner.x ? cornerArray[2] : cornerArray[3];
        br = cornerArray[2].corner.x > cornerArray[3].corner.x ? cornerArray[2] : cornerArray[3];
        console.log("tl: ", tl);
        console.log("tr: ", tr);
        console.log("bl: ", bl);
        console.log("be: ", br);
    }
    else
    {
        if(isLandscape)
        {
            tl = {corner: {x: SIZE/2, y: SIZE/2}}
            tr = {corner: {x: IMAGE_LONG - SIZE/2, y: SIZE/2}}
            bl = {corner: {x: SIZE/2, y: IMAGE_SHORT -SIZE/2}}
            br = {corner: {x: IMAGE_LONG - SIZE/2, y: IMAGE_SHORT -SIZE/2}}
        }
        else
        {
            tl = {corner: {x: SIZE/2, y: SIZE/2}}
            tr = {corner: {x: IMAGE_SHORT - SIZE/2, y: SIZE/2}}
            bl = {corner: {x: SIZE/2, y: IMAGE_LONG - SIZE/2}}
            br = {corner: {x: IMAGE_SHORT - SIZE/2, y: IMAGE_LONG -SIZE/2}}
        }
    }


    //Calculate the max width/height
    let widthBottom = Math.hypot(br.corner.x - bl.corner.x, br.corner.y - bl.corner.y);
    let widthTop = Math.hypot(tr.corner.x - tl.corner.x, tr.corner.y - tl.corner.y);            
    let heightRight = Math.hypot(tr.corner.x - br.corner.x, tr.corner.y - br.corner.y);
    let heightLeft = Math.hypot(tl.corner.x - bl.corner.x, tr.corner.y - bl.corner.y);

    perspectiveWidth = (widthBottom > widthTop) ? widthBottom : widthTop;
    perspectiveHeight = (heightRight > heightLeft) ? heightRight : heightLeft;            
    

    ctx = canvas.getContext("2d");
    zoomCtx = zoom.getContext("2d");
    canvasRect = canvas.getBoundingClientRect();
    console.log("canvasRect: ", canvasRect);


    createSquares(tl, tr, bl, br);
    canvasEvents(canvas);            
    run();       

    document.getElementById("btnRotate").disabled = false;
}




function canvasEvents(canvas)
{
    canvas.addEventListener("touchstart", onStart);
    canvas.addEventListener('touchmove', onMove);
    canvas.addEventListener("touchstop", onStop);
    canvas.addEventListener("mousedown", onStart);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener("mouseup", onStop);
}


function onStart(e)
{ 
    
    pointerCoords.update(e);
    console.log("drag data: ", dragData);
    console.log("pointer coords: ", pointerCoords.x, pointerCoords.y);
    console.log("canvas size: ", canvasHeight, canvasWidth);
    //ratio = isLandscape ? IMAGE_LONG/canvasWidth : IMAGE_SHORT/canvasWidth; //redimensión del canvas por css, hay que aplicar un ratio
    ratio = IMAGE_LONG/canvasWidth;
    console.log("ratio: " + ratio);


    // look if we start the touch within a draggable object
    var target = null;
    for (var i = 0; i < dragData.draggables.length; i++) 
    {
        var draggable = dragData.draggables[i];
        if (draggable.isPointInside(pointerCoords.x*ratio, pointerCoords.y*ratio)) 
        {
            e.preventDefault();
            console.log("isPointInside")
            target = draggable;
            break;
        }
    }
    dragData.target = target;
}

function onMove(e) {
    //e.preventDefault();
    //ratio = isLandscape ? IMAGE_LONG/canvasWidth : IMAGE_SHORT/canvasWidth; //redimensión del canvas por css, hay que aplicar un ratio
    ratio = IMAGE_LONG/canvasWidth;
    pointerCoords.update(e);
    var target = dragData.target;
    if (!target) return;
    target.x = pointerCoords.x*ratio;
    target.y = pointerCoords.y*ratio;

    var coords = e.touches ? e.touches[0] : e;
    let x = (coords.pageX - canvasRect.left);
    let y = (coords.pageY - canvasRect.top);
    zoomCtx.fillRect(0,0, zoom.width, zoom.height);
    zoomCtx.drawImage(canvas, x-50, y-25, 100, 50, 0,0, canvasWidth/4, canvasHeight/4);
    //zoom.style.top = e.pageY + 10 + "px"
    //zoom.style.left = e.pageX + 10 + "px"
    //zoom.style.display = "block";
}

function onStop(e) {
    pointerCoords.update(e);
    e.preventDefault();
    if (!dragData.target) return;
    onMove(e);
    dragData.target = null;
    zoom.style.display = "none";
}




function rotateCanvas()
{
    cv.transpose(originRes, originRes);
    cv.flip(originRes, originRes, 2);
}

/**
 * Aplicamos transformación de perspectiva
 */
function applyTransform()
{
    let finalDestCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, perspectiveWidth - 1, 0, perspectiveWidth - 1, perspectiveHeight - 1, 0, perspectiveHeight - 1]); //

    
    let srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [squareTL.x + SIZE/2, squareTL.y + SIZE/2, 
                                                        squareTR.x - SIZE/2, squareTR.y + SIZE/2, 
                                                        squareBR.x - SIZE/2, squareBR.y - SIZE/2, 
                                                        squareBL.x + SIZE/2, squareBL.y - SIZE/2]);

    let dsize = new cv.Size(perspectiveWidth, perspectiveHeight);
    let M = cv.getPerspectiveTransform(srcCoords, finalDestCoords)
    
    

    cv.warpPerspective(originRes, originRes, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

    let filter = new cv.Mat();
    cv.cvtColor(originRes, originRes, cv.COLOR_RGBA2RGB, 0);
    cv.bilateralFilter(originRes, filter, 5, 60, 60, cv.BORDER_DEFAULT);

    originRes = filter.clone();

    if(!window.mobileCheck())
        canvas.style.width = "50%";
    cv.imshow('canvasOutput', originRes);
    //console.log("canvas final: ", document.getElementById("canvasOutput").toDataURL());

    mat.delete();
    filter.delete();

    renderSquares = false;
    //document.getElementById("btnApply").add = true;
    document.getElementById("btnApply").classList.add('hidden');
    document.getElementById("btnRotate").classList.remove('hidden');
}



function getOrientation(file, callback) {
    var reader = new FileReader();
  
    reader.onload = function(event) {
      var view = new DataView(event.target.result);
  
      if (view.getUint16(0, false) !== 0xFFD8) return callback(-2);
  
      var length = view.byteLength,
          offset = 2;
  
      while (offset < length) {
        var marker = view.getUint16(offset, false);
        offset += 2;
  
        if (marker === 0xFFE1) {
          if (view.getUint32(offset += 2, false) !== 0x45786966) {
            return callback(-1);
          }
          var little = view.getUint16(offset += 6, false) === 0x4949;
          offset += view.getUint32(offset + 4, little);
          var tags = view.getUint16(offset, little);
          offset += 2;
  
          for (var i = 0; i < tags; i++)
            if (view.getUint16(offset + (i * 12), little) === 0x0112)
              return callback(view.getUint16(offset + (i * 12) + 8, little));
        }
        else if ((marker & 0xFF00) !== 0xFF00) break;
        else offset += view.getUint16(offset, false);
      }
      return callback(-1);
    };
  
    reader.readAsArrayBuffer(file.slice(0, 64 * 1024));
  };


window.addEventListener("orientationchange", function()
{
    /*console.log("orientationchange")
    ratio = isLandscape ? IMAGE_LONG/canvasWidth : IMAGE_SHORT/canvasWidth;//redimensión del canvas por css, hay que aplicar un ratio*/
})




export default Scanner;
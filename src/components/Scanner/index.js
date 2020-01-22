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
            let mat = new cv.Mat();
            console.log(mat.size());
            mat.delete();
            this.setState({openCvReady: true});
        };
    }   

    render()
    {
        return(<div>
                    <h4 id="status">{this.state.openCvReady ? "Listo" : "Cargando"}</h4>
                    {                        
                        <div className={this.state.openCvReady ? "" : "hidden"}>
                            <div className="caption"><input type="file" id="fileInput" name="file" accept="image/*"/></div>
                            <img id="imageSrc" alt="No Image" className="small" />
                            <canvas id="canvasOutput"  height="200" width="300"></canvas>  
                            <div><button id="btnApply" type="button" onClick={() => applyTransform()}>Aplicar</button></div>
                        </div>
                    }
            </div>
        )
    }

    
}





let theWidth, theHeight, origin, originRes, tl, tr, bl, br, mat, touchX, touchY, ctx, canvasWidth, canvasHeight, canvasRect;
let squareTL, squareTR, squareBL, squareBR; //Coordenadas de las esquinas
let imageWidth, imageHeight;
let renderSquares = true;//Controla si se muestra la caja de recorte
let isLandscape = true; //Indica si la foto ha sido hecha en vertical u horizontal
let orientationCode = 1;//Indica la orientación de la imagen basado en EXIF (http://www.daveperrett.com/images/articles/2012-07-28-exif-orientation-handling-is-a-ghetto/EXIF_Orientations.jpg)

const lineColor = '#005400';
const SIZE = 20;

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

    var canvas = document.getElementById("canvasOutput");    

    inputElement.addEventListener("change", (e) => 
    {        
        imgElement.src = URL.createObjectURL(e.target.files[0]);
        getOrientation(e.target.files[0], function(orientation)
        {
            orientationCode = orientation;
            console.log("orientation code: " + orientationCode)
            isLandscape = orientationCode === 1 || orientationCode === 2 || orientationCode === 3 || orientationCode === 4;
        })

    }, false);

    imgElement.onload = function() 
    {
        mat = cv.imread(imgElement);
        imageWidth  = this.width;
        imageHeight = this.height; 
        findContours(mat);
    };


    function findContours(mat)
    {
        renderSquares = true;
        document.getElementById("btnApply").disabled = false;

        let dst = new cv.Mat();
        let dstRes = new cv.Mat();
        origin = mat.clone();

        console.log("isLandscape: " + isLandscape);

        
        if(!isLandscape)
        {
            cv.transpose(origin, origin);
            cv.flip(origin, origin, 2);
        }
        //Redimensionamos la imagen original
        originRes = new cv.Mat();
        let resize =  isLandscape ? new cv.Size(1280, 720) : new cv.Size(720, 1280);
        cv.resize(origin, originRes, resize, 0, 0, cv.INTER_AREA);


        
        //Aplicamos filtros para facilitar la búsqueda de contornos        
        cv.cvtColor(mat, dst, cv.COLOR_RGB2GRAY);
        let ksize = new cv.Size(5, 5);
        cv.GaussianBlur(dst, dst, ksize, 0, 0, cv.BORDER_DEFAULT);
        cv.Canny(dst, dst, 50, 100, 3, true);

        cv.resize(dst, dstRes, resize, 0, 0, cv.INTER_AREA);

        if(!isLandscape)
        {
            cv.transpose(dstRes, dstRes);
            cv.flip(dstRes, dstRes, 2);
        }

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


        //if(sortableContours.length > 0)
        {
            //Nos aseguramos que el area más grande tiene 4 esquinas
            let approx = new cv.Mat();
            cv.approxPolyDP(sortableContours[0].contour, approx, .05 * sortableContours[0].perimiterSize, true);                

            if (approx.rows == 4) 
            {
                console.log('Found a 4-corner approx');
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
                console.log("tl: ",tl)
            }
            else
            {
                if(isLandscape)
                {
                    tl = {corner: {x: 10, y: 10}}
                    tr = {corner: {x: 1270, y: 10}}
                    bl = {corner: {x: 10, y: 710}}
                    br = {corner: {x: 1270, y: 710}}
                }
                else
                {
                    tl = {corner: {x: 10, y: 10}}
                    tr = {corner: {x: 710, y: 10}}
                    bl = {corner: {x: 10, y: 1270}}
                    br = {corner: {x: 710, y: 1270}}
                }
            }


            //Calculate the max width/height
            let widthBottom = Math.hypot(br.corner.x - bl.corner.x, br.corner.y - bl.corner.y);
            let widthTop = Math.hypot(tr.corner.x - tl.corner.x, tr.corner.y - tl.corner.y);            
            let heightRight = Math.hypot(tr.corner.x - br.corner.x, tr.corner.y - br.corner.y);
            let heightLeft = Math.hypot(tl.corner.x - bl.corner.x, tr.corner.y - bl.corner.y);

            theWidth = (widthBottom > widthTop) ? widthBottom : widthTop;
            theHeight = (heightRight > heightLeft) ? heightRight : heightLeft;            
            

            ctx = canvas.getContext("2d");
            //if(!isLandscape) ctx.rotate(90*Math.PI/180);
            canvasRect = canvas.getBoundingClientRect();
            canvasWidth = canvas.width;
            canvasHeight = canvas.height;

            createCircles(tl, tr, bl, br);
            canvasEvents(canvas);            
            run();             
            
        }

        
    }

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
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        cv.imshow('canvasOutput', originRes);
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

    function createCircles(tl, tr, bl, br)
    {
        squareTL = new Circle(tl.corner.x - SIZE/2, tl.corner.y - SIZE/2, SIZE, SIZE);
        squareTR = new Circle(tr.corner.x - SIZE/2, tr.corner.y - SIZE/2, SIZE, SIZE);
        squareBL = new Circle(bl.corner.x - SIZE/2, bl.corner.y - SIZE/2, SIZE, SIZE);
        squareBR = new Circle(br.corner.x - SIZE/2, br.corner.y - SIZE/2, SIZE, SIZE);
        dragData.draggables.push(squareTL, squareTR, squareBL, squareBR);
    }

    function Circle(x, y, w, h)
    {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    Circle.prototype = {
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
            this.x = coords.pageX - canvasRect.left;
            this.y = coords.pageY - canvasRect.top;
        }
    };
    

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
        e.preventDefault();
        pointerCoords.update(e);
        console.log("onStart: ", e);

        // look if we start the touch within a draggable object
        var target = null;
        for (var i = 0; i < dragData.draggables.length; i++) 
        {
            var draggable = dragData.draggables[i];
            if (draggable.isPointInside(pointerCoords.x, pointerCoords.y)) 
            {
                target = draggable;
                break;
            }
        }
        dragData.target = target;
    }

    function onMove(e) {
        pointerCoords.update(e);
        var target = dragData.target;
        if (!target) return;
        target.x = pointerCoords.x;
        target.y = pointerCoords.y;
    }
    
    function onStop(e) {
        console.log("onStop: ", e);
        pointerCoords.update(e);
        e.preventDefault();
        if (!dragData.target) return;
        onMove(e);
        dragData.target = null;
    }

});

/**
 * Aplicamos transformación de perspectiva
 */
function applyTransform()
{
    let finalDestCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, theWidth - 1, 0, theWidth - 1, theHeight - 1, 0, theHeight - 1]); //

    
    let srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [squareTL.x + SIZE/2, squareTL.y + SIZE/2, 
                                                        squareTR.x - SIZE/2, squareTR.y + SIZE/2, 
                                                        squareBR.x - SIZE/2, squareBR.y - SIZE/2, 
                                                        squareBL.x + SIZE/2, squareBL.y - SIZE/2]);

    let dsize = new cv.Size(theWidth, theHeight);
    let M = cv.getPerspectiveTransform(srcCoords, finalDestCoords)
    
    

    cv.warpPerspective(originRes, originRes, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

    let filter = new cv.Mat();
    cv.cvtColor(originRes, originRes, cv.COLOR_RGBA2RGB, 0);
    cv.bilateralFilter(originRes, filter, 5, 60, 60, cv.BORDER_DEFAULT);

    originRes = filter.clone();

    cv.imshow('canvasOutput', originRes);
    //console.log("canvas final: ", document.getElementById("canvasOutput").toDataURL());

    mat.delete();
    filter.delete();

    renderSquares = false;
    document.getElementById("btnApply").disabled = true;

}

function getOrientation(file, callback) {
    var reader = new FileReader();
  
    reader.onload = function(event) {
      var view = new DataView(event.target.result);
  
      if (view.getUint16(0, false) != 0xFFD8) return callback(-2);
  
      var length = view.byteLength,
          offset = 2;
  
      while (offset < length) {
        var marker = view.getUint16(offset, false);
        offset += 2;
  
        if (marker == 0xFFE1) {
          if (view.getUint32(offset += 2, false) != 0x45786966) {
            return callback(-1);
          }
          var little = view.getUint16(offset += 6, false) == 0x4949;
          offset += view.getUint32(offset + 4, little);
          var tags = view.getUint16(offset, little);
          offset += 2;
  
          for (var i = 0; i < tags; i++)
            if (view.getUint16(offset + (i * 12), little) == 0x0112)
              return callback(view.getUint16(offset + (i * 12) + 8, little));
        }
        else if ((marker & 0xFF00) != 0xFF00) break;
        else offset += view.getUint16(offset, false);
      }
      return callback(-1);
    };
  
    reader.readAsArrayBuffer(file.slice(0, 64 * 1024));
  };
export default Scanner;
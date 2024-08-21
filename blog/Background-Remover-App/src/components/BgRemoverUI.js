import { useRef, useState, useEffect } from 'react';
import path from 'path';

export default function RmbgUI() {

  // Helper functions to manipulate blob/bmp images
  class FileReaderEx extends FileReader {
    #readAs(blob, ctx) {
      return new Promise((resolve, reject) => {
        super.addEventListener('load', ({target}) => resolve(target.result));
        super.addEventListener('error', ({target}) => reject(target.error));
        super[ctx](blob);
      });
    }
    readAsDataURL(blob) {
      return this.#readAs(blob, 'readAsDataURL');
    }
  }

  class ImageEx extends Image {
    create(blob) {
      return new Promise((resolve, reject) => {
        super.addEventListener('load', () => resolve(this));
        super.addEventListener('error', reject);
        super.src = URL.createObjectURL(blob);
      });
    }
  }

  const resizeImage = async (imageBlob, width, quality=null) => {
    const _resizeImage = async (imageBlob, width, quality) => {
      let type = 'image/jpeg';
      if (quality === null) [type, quality] = ['image/png', 1];
      const ctx = document.createElement('canvas').getContext('2d');
      const image = await new ImageEx().create(imageBlob);
      if (width === null) width = image.naturalWidth; 
      const [widthOrig, heightOrig] = [image.naturalWidth, image.naturalHeight];
      const height = Math.floor(heightOrig * (width / widthOrig));
      [ctx.canvas.width, ctx.canvas.height] = [width, height];
      ctx.drawImage(
        image, 0, 0, widthOrig, heightOrig, 0, 0, width, height);
      return new Promise((resolve) => {
        ctx.canvas.toBlob(resolve, type, quality);
      });
    };

    const blob = await _resizeImage(imageBlob, width, quality);
    blob.name = imageBlob.name;
    return blob;
  };

  const blobToBase64 = async (imageBlob) => {
    const imageDataURL = await new FileReaderEx().readAsDataURL(imageBlob);
    const imageBase64 = imageDataURL.replace('data:', '').replace(/^.+,/, '');
    return imageBase64;
  };

  const base64toBlob = (base64) => {
    const bin = atob(base64.replace(/^.*,/, ''));
    const buffer = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++)
      buffer[i] = bin.charCodeAt(i);
    const blob = new Blob([buffer.buffer], {type: 'image/png'});
    return blob;
  };

  const getTimestamp = () => {
    const d = new Date();
    const DateTimeFormat = 'YYYYMMDD_hhmiss';
    let ts = DateTimeFormat
      .replace(/YYYY/g, String(d.getFullYear()))
      .replace(/MM/g, ('0' + (d.getMonth() + 1)).slice(-2))
      .replace(/DD/g, ('0' + d.getDate()).slice(-2))
      .replace(/hh/g, ('0' + d.getHours()).slice(-2))
      .replace(/mi/g, ('0' + d.getMinutes()).slice(-2))
      .replace(/ss/g, ('0' + d.getSeconds()).slice(-2));
    return ts;
  };


  // main part
  const inputRef = useRef(null);
  const [imageInfo, setImageInfo] = useState(
    {'blob': null, 'preblob': null, 'bmp': null, 'key': getTimestamp()});
  const initDataset = {'box': [0, 0, 0, 0], 'points': [], 'labels': []};
  const [dataset, setDataset] = useState(initDataset);
  const [mode, setMode] = useState(null);
  const [processing, setProcessing] = useState(false);
  let [startX, startY, isDrawing] = [0, 0, false];

  useEffect(() => { drawCanvas(); });

  const drawCanvas = () => {
    if (imageInfo.blob == null) return; 
    const ctx = document.getElementById('canvas').getContext('2d');
    const bmp = imageInfo.bmp;
    [ctx.fillStyle, ctx.lineWidth] = ['Gray', 1];
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(imageInfo.bmp, 0, 0);
    for (let i=0; i<dataset.points.length; i++) {
      const [x, y] = dataset.points[i];
      const label = dataset.labels[i];
      if (label === 0) [ctx.strokeStyle, ctx.fillStyle] = ['White', 'Blue'];
      if (label === 1) [ctx.strokeStyle, ctx.fillStyle] = ['White', 'Red'];
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.closePath();
      ctx.fill();
    }
    const [x1, y1, x2, y2] = dataset.box;
    if (x1 !== 0 | y1 !== 0 | x2 !== 0 | y2 !== 0) {
      [ctx.strokeStyle, ctx.lineWidth] = ['Red', 3];
      ctx.strokeRect(x1, y1, x2-x1, y2-y1);
    }
    if (mode == null) registHandlers('box');
  };


  const registHandlers = (newMode) => {
    if (mode === newMode) return;
    setMode(newMode);
    const canvas = document.getElementById('canvas');
    const newCanvas = canvas.cloneNode(true); // Drop old event listners
    canvas.replaceWith(newCanvas);
    let label = null;
    if (newMode === 'fg') label = 1;
    if (newMode === 'bg') label = 0;
    if (label !== null) {  // fg or bg
      newCanvas.addEventListener('click', (e) => {
        setDataset((currentDataset) => {
          const newDataset = {...currentDataset};
          newDataset.points.push([e.offsetX, e.offsetY]);
          newDataset.labels.push(label);
          return newDataset;
        });
      });
    }
    if (newMode === 'box') {
      const bmp = imageInfo.bmp;
      const [width, height] = [bmp.width, bmp.height];
      newCanvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        [startX, startY] = [e.offsetX, e.offsetY];
        if (startX < 0) startX = 0;
        if (startY < 0) startY = 0;
        if (startX > width) startX = width;
        if (startY > height) startY = height;
      });
      newCanvas.addEventListener('mouseup', () => { isDrawing = false;});
      newCanvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        let [currentX, currentY] = [e.offsetX, e.offsetY];
        if (currentX < 0) currentX = 0;
        if (currentY < 0) currentY = 0;
        if (currentX > width) currentX = width;
        if (currentY > height) currentY = height;
        const [x1, y1] = [Math.min(startX, currentX),
                          Math.min(startY, currentY)]
        const [x2, y2] = [Math.max(startX, currentX),
                          Math.max(startY, currentY)]
        setDataset((currentDataset) => {
          const newDataset = {...currentDataset};
          newDataset.box = [x1, y1, x2, y2]
          return newDataset;
        });
      });
    }
  };


  const onFileInputChange = async (evt) => {
    const blob = evt.target.files[0];
    const blobPng = await resizeImage(blob, null); // Convert to png
    const blobResized = await resizeImage(blob, 600);
    const bmp = await createImageBitmap(blobResized);
    setMode(null);
    setDataset(initDataset);
    setProcessing(false);
    setImageInfo({'blob': blobPng, 'preblob': null, 'bmp': bmp,
                  'key': getTimestamp()});
  };

  const undoImage = async () => {
    const [blob, key] = [imageInfo.preblob, imageInfo.key];
    if (blob === null) return;
    const blobResized = await resizeImage(blob, 600); 
    const bmp = await createImageBitmap(blobResized);
    setImageInfo({'blob': blob, 'preblob': null, 'bmp': bmp, 'key' :key});
  };

  const processImage = async () => {
    const callBackend = async (id, imageBase64, dataset) => {
      const apiEndpoint = '/api/bgRemover';
      const request = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: id,
          image: imageBase64,
          box: dataset.box,
          points: dataset.points,
          labels: dataset.labels
        })
      };
      const res = await fetch(apiEndpoint, request);
      const data = await res.json();
      return data.image;
    };

    setProcessing(true);
    const [preblob, key] = [imageInfo.blob, imageInfo.key];
    const image = await new ImageEx().create(preblob);
    const ratio = image.naturalWidth / imageInfo.bmp.width;
    const datasetRescaled = structuredClone(dataset);
    for (let i = 0; i < 4; i++)
      datasetRescaled.box[i] = Math.floor(dataset.box[i] * ratio);
    for (let i = 0; i < dataset.points.length; i++) {
      const [x, y] = dataset.points[i];
      datasetRescaled.points[i] = [Math.floor(x * ratio), Math.floor(y * ratio)];
    }
    // Use jpeg to avoid the 1.5M size limit
    // https://cloud.google.com/vertex-ai/docs/predictions/get-online-predictions
    let blobJpeg;
    for (let quality = 1.0; quality > 0; quality -= 0.1) {
      blobJpeg = await resizeImage(preblob, null, quality);
      if (blobJpeg.size < 1.0 * 1024 * 1024) break
    }      
    const imageBase64 = await blobToBase64(blobJpeg);
    const newImageBase64 = await callBackend(preblob.name, imageBase64,
                                             datasetRescaled);
    const blob = base64toBlob(newImageBase64);
    blob.name = preblob.name;
    const blobResized = await resizeImage(blob, 600); 
    const bmp = await createImageBitmap(blobResized);
    setImageInfo({'blob': blob, 'preblob': preblob, 'bmp': bmp, 'key' :key});
    setProcessing(false);
  };


  // Construct components
  let imageArea = (<></>);
  const bmp = imageInfo.bmp;
  if (bmp !== null) {
    const inputId = {box: 'selector', fg:'selector', bg:'selector'};
    inputId[mode] = 'selected';
    const [width, height] = [bmp.width, bmp.height];
    imageArea = (
      <>
        <canvas id='canvas' width={width} height={height}
                style={{border: '20px solid gray'}}></canvas>
        <div>
          <input id='button' type='button' value='Clear'
                 onClick={() => {
                   setDataset(initDataset);
                   registHandlers('box');
                 }}/>
          <input id={inputId.box} type='button' value='Box'
                 onClick={() => registHandlers('box')}/>
          <input id={inputId.fg} type='button' value='Object'
                 onClick={() => registHandlers('fg')}/>
          <input id={inputId.bg} type='button' value='Background'
                 onClick={() => registHandlers('bg')}/>
        </div>
      </>
    );
  }

  const uploadButton = (
    <>
      <button onClick={() => inputRef.current.click()}>
        Upload
      </button>
      <input ref={inputRef} hidden type='file' accept='image/*'
             onChange={onFileInputChange}/>
    </>
  );

  const handleDownload = () => {
    const blob = imageInfo.blob;
    const filepath = path.parse(blob.name);
    const filename = filepath.name + '_' + getTimestamp() + '.png';
    const downloadElem = document.getElementById('download')
    downloadElem.href = URL.createObjectURL(blob);
    downloadElem.download = filename;
  };

  let buttonArea = (<>{uploadButton}</>);
  if (bmp !== null) {
    buttonArea = (
      <>
        {uploadButton}
        <button disabled={processing} onClick={() => processImage()}>
          Process
        </button>
        <button disabled={!imageInfo.preblob} onClick={() => undoImage()}>
          Undo
        </button>
        <a id='download' href='#' download='' onClick={() => handleDownload()}>
          <button>Download</button>
        </a>
      </>
    );
  }

  const element = (
    <div key={imageInfo.key}>
      <div>{imageArea}</div>
      <div>{buttonArea}</div>
    </div>
  )

  return element;
}

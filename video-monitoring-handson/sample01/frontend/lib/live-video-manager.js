export class LiveVideoManager {
    constructor(previewVideoElement, previewCanvasElement) {
        this.previewVideoElement = previewVideoElement;
        this.previewCanvasElement = previewCanvasElement;
        this.ctx = this.previewCanvasElement.getContext("2d");
        this.stream = null;
        this.interval = null;
        this.onNewFrame = (newFrame) => {};
    }

    async startWebcam() {
        if (this.stream) return;
        console.log("startWebcam");
        try {
            const constraints = {video: true};
            this.stream =
                await navigator.mediaDevices.getUserMedia(constraints);
            this.previewVideoElement.srcObject = this.stream;
        } catch (err) {
            console.error("Error accessing the webcam: ", err);
        }
        // capture frame every second.
        this.interval = setInterval(this.newFrame.bind(this), 1000);
    }

    stopWebcam() {
        if (!this.stream) return;
        clearInterval(this.interval);
        const tracks = this.stream.getTracks();
        tracks.forEach((track) => {
            track.stop();
        });
        this.stream = null;
    }

    newFrame() {
        if (this.stream === null) return;
        // copy video frame into a preview canvas.
        this.previewCanvasElement.width = this.previewVideoElement.videoWidth;
        this.previewCanvasElement.height = this.previewVideoElement.videoHeight;
        this.ctx.drawImage(
            this.previewVideoElement,
            0,
            0,
            this.previewCanvasElement.width,
            this.previewCanvasElement.height,
        );
        // convert canvas data into base64 binary.
        const imageData = this.previewCanvasElement
            .toDataURL("image/jpeg").split(",")[1].trim();
        this.onNewFrame(imageData);  // callback to handle the image data.
    }
}

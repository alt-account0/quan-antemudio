document.addEventListener('DOMContentLoaded', () => {

    // ────────────────────────────────────────────────
    // DOM Elements
    // ────────────────────────────────────────────────
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const pencilBtn = document.getElementById('pencil');
    const eraserBtn = document.getElementById('eraser');
    const bucketBtn = document.getElementById('bucket');
    const colorPicker = document.getElementById('color-picker');
    const clearBtn = document.getElementById('clear');
    const addFrameBtn = document.getElementById('add-frame');
    const deleteFrameBtn = document.getElementById('delete-frame');
    const duplicateFrameBtn = document.getElementById('duplicate-frame');
    const fpsInput = document.getElementById('fps');
    const playBtn = document.getElementById('play');
    const stopBtn = document.getElementById('stop');
    const timeline = document.getElementById('timeline');
    const resolutionSelect = document.getElementById('resolution');
    const exportVideoBtn = document.getElementById('export-video');
    const saveQua1Btn = document.getElementById('save-qua1');
    const loadQua1Btn = document.getElementById('load-qua1');
    const loadFileInput = document.getElementById('load-file-input');

    // ────────────────────────────────────────────────
    // State
    // ────────────────────────────────────────────────
    let drawing = false;
    let tool = 'pencil';
    let frames = [];
    let currentFrameIndex = -1;
    let animationInterval = null;

    // Initialize with first frame
    addNewFrame();

    // ────────────────────────────────────────────────
    // Tool selection
    // ────────────────────────────────────────────────
    pencilBtn.addEventListener('click', () => tool = 'pencil');
    eraserBtn.addEventListener('click', () => tool = 'eraser');
    bucketBtn.addEventListener('click', () => tool = 'bucket');

    // ────────────────────────────────────────────────
    // Drawing events
    // ────────────────────────────────────────────────
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('click', handleClick); // bucket fill

    function startDrawing(e) {
        if (tool === 'bucket') return;
        drawing = true;
        draw(e);
    }

    function stopDrawing() {
        if (drawing) {
            drawing = false;
            ctx.beginPath();
            saveCurrentFrame();
        }
    }

    function draw(e) {
        if (!drawing || tool === 'bucket') return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.lineWidth = tool === 'eraser' ? 12 : 5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : colorPicker.value;

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    // ────────────────────────────────────────────────
    // Bucket Fill
    // ────────────────────────────────────────────────
    function handleClick(e) {
        if (tool !== 'bucket') return;

        const rect = canvas.getBoundingClientRect();
        const x = Math.floor(e.clientX - rect.left);
        const y = Math.floor(e.clientY - rect.top);

        const fillColor = hexToRgb(colorPicker.value);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const targetColor = getPixelColor(imageData, x, y);

        if (colorsMatch(targetColor, fillColor)) return;

        floodFill(imageData, x, y, targetColor, fillColor);
        ctx.putImageData(imageData, 0, 0);
        saveCurrentFrame();
    }

    function hexToRgb(hex) {
        const r = parseInt(hex.slice(1,3),16);
        const g = parseInt(hex.slice(3,5),16);
        const b = parseInt(hex.slice(5,7),16);
        return [r, g, b];
    }

    function getPixelColor(imgData, x, y) {
        const idx = (y * imgData.width + x) * 4;
        return [imgData.data[idx], imgData.data[idx+1], imgData.data[idx+2]];
    }

    function colorsMatch(c1, c2) {
        return c1[0]===c2[0] && c1[1]===c2[1] && c1[2]===c2[2];
    }

    function floodFill(imageData, startX, startY, target, fill) {
        const {width, height, data} = imageData;
        const stack = [[startX, startY]];

        while (stack.length) {
            const [x, y] = stack.pop();
            const idx = (y * width + x) * 4;

            if (data[idx]===target[0] && data[idx+1]===target[1] && data[idx+2]===target[2]) {
                data[idx]   = fill[0];
                data[idx+1] = fill[1];
                data[idx+2] = fill[2];
                data[idx+3] = 255;

                if (x > 0)         stack.push([x-1, y]);
                if (x < width-1)   stack.push([x+1, y]);
                if (y > 0)         stack.push([x, y-1]);
                if (y < height-1)  stack.push([x, y+1]);
            }
        }
    }

    // ────────────────────────────────────────────────
    // Frame management
    // ────────────────────────────────────────────────
    function addNewFrame() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const newFrame = {
            data: ctx.getImageData(0, 0, canvas.width, canvas.height),
            thumbnail: canvas.toDataURL('image/png')
        };
        frames.push(newFrame);
        currentFrameIndex = frames.length - 1;
        updateTimeline();
        loadCurrentFrame();
    }

    function deleteCurrentFrame() {
        if (frames.length <= 1) return alert("Can't delete the last frame!");
        frames.splice(currentFrameIndex, 1);
        currentFrameIndex = Math.min(currentFrameIndex, frames.length - 1);
        updateTimeline();
        loadCurrentFrame();
    }

    function duplicateCurrentFrame() {
        const cur = frames[currentFrameIndex];
        const copy = {
            data: new ImageData(new Uint8ClampedArray(cur.data.data), cur.data.width, cur.data.height),
            thumbnail: cur.thumbnail
        };
        frames.splice(currentFrameIndex + 1, 0, copy);
        currentFrameIndex++;
        updateTimeline();
        loadCurrentFrame();
    }

    function clearCurrentFrame() {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveCurrentFrame();
    }

    function saveCurrentFrame() {
        if (currentFrameIndex < 0) return;
        frames[currentFrameIndex].data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        frames[currentFrameIndex].thumbnail = canvas.toDataURL('image/png');
        updateTimeline();
    }

    function loadCurrentFrame() {
        if (currentFrameIndex >= 0 && currentFrameIndex < frames.length) {
            ctx.putImageData(frames[currentFrameIndex].data, 0, 0);
        }
    }

    function updateTimeline() {
        timeline.innerHTML = '';
        frames.forEach((f, i) => {
            const img = document.createElement('img');
            img.src = f.thumbnail;
            img.classList.add('frame-thumbnail');
            if (i === currentFrameIndex) img.classList.add('active');
            img.onclick = () => {
                currentFrameIndex = i;
                loadCurrentFrame();
                updateTimeline();
            };
            timeline.appendChild(img);
        });
    }

    // ────────────────────────────────────────────────
    // Playback
    // ────────────────────────────────────────────────
    playBtn.addEventListener('click', () => {
        stopAnimation();
        if (frames.length < 2) return alert("Need at least 2 frames to play!");
        let i = 0;
        const fps = parseInt(fpsInput.value) || 12;
        animationInterval = setInterval(() => {
            ctx.putImageData(frames[i].data, 0, 0);
            i = (i + 1) % frames.length;
        }, 1000 / fps);
    });

    stopBtn.addEventListener('click', () => {
        stopAnimation();
        loadCurrentFrame();
    });

    function stopAnimation() {
        if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
        }
    }

    // ────────────────────────────────────────────────
    // Export Video (WebM)
    // ────────────────────────────────────────────────
    function getExportDimensions() {
        const res = resolutionSelect.value;
        if (res === '720')  return {w:1280, h:720};
        if (res === '1080') return {w:1920, h:1080};
        return {w: canvas.width, h: canvas.height};
    }

    exportVideoBtn.addEventListener('click', () => {
        if (!frames.length) return alert("No frames to export!");

        const dims = getExportDimensions();
        const fps = parseInt(fpsInput.value) || 12;

        const capturer = new CCapture({
            format: 'webm',
            framerate: fps,
            name: 'quan-antemudio',
            quality: 100
        });

        capturer.start();

        let loaded = 0;
        frames.forEach(frame => {
            const img = new Image();
            img.src = frame.thumbnail;
            img.onload = () => {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = dims.w;
                tempCanvas.height = dims.h;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(img, 0, 0, dims.w, dims.h);
                capturer.capture(tempCanvas);
                loaded++;
                if (loaded === frames.length) {
                    setTimeout(() => {
                        capturer.stop();
                        capturer.save(); // downloads quan-antemudio.webm
                    }, 1000);
                }
            };
        });
    });

    // ────────────────────────────────────────────────
    // .qau1 project save / load
    // ────────────────────────────────────────────────
    saveQua1Btn.addEventListener('click', () => {
        if (!frames.length) return alert("Nothing to save!");

        const project = {
            version: "1.0",
            fps: parseInt(fpsInput.value) || 12,
            width: canvas.width,
            height: canvas.height,
            frames: frames.map(f => ({ dataURL: f.thumbnail }))
        };

        const blob = new Blob([JSON.stringify(project, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'quan-project.qau1';
        a.click();
        URL.revokeObjectURL(url);
    });

    loadQua1Btn.addEventListener('click', () => loadFileInput.click());

    loadFileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!data.frames?.length) throw new Error("No frames found");

                fpsInput.value = data.fps || 12;
                frames = [];

                let count = 0;
                data.frames.forEach(item => {
                    const img = new Image();
                    img.src = item.dataURL;
                    img.onload = () => {
                        const temp = document.createElement('canvas');
                        temp.width = canvas.width;
                        temp.height = canvas.height;
                        const tctx = temp.getContext('2d');
                        tctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                        frames.push({
                            data: tctx.getImageData(0,0,canvas.width,canvas.height),
                            thumbnail: item.dataURL
                        });

                        count++;
                        if (count === data.frames.length) {
                            currentFrameIndex = 0;
                            updateTimeline();
                            loadCurrentFrame();
                            alert("Project loaded!");
                        }
                    };
                });
            } catch (err) {
                alert("Invalid .qau1 file\n" + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    // ────────────────────────────────────────────────
    // Initial frame management buttons
    // ────────────────────────────────────────────────
    addFrameBtn.addEventListener('click', addNewFrame);
    deleteFrameBtn.addEventListener('click', deleteCurrentFrame);
    duplicateFrameBtn.addEventListener('click', duplicateCurrentFrame);
    clearBtn.addEventListener('click', clearCurrentFrame);

    console.log("Quan Antemudio ready ✓");
});
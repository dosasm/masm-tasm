class Events{
    consumers={frame:[],frameSize:[],exit:[]}
    addConsumer(key,consumer){
        this.consumers[key].push(consumer)
    }
    onFrame(consumer){
        this.addConsumer("frame",consumer)
    }
    onFrameSize(consumer){
        this.addConsumer("frameSize",consumer)
    }
    onExit(consumer){
        this.addConsumer("exit",consumer)
    }
    
}


class CI{
    _width=0;
    _height=0;
    width(){return this._width}
    height(){return this._height}
    
    _events=new Events()
    events(){return this._events}
    constructor(){

    }
}

const ci=new CI()

window.addEventListener('message', event => {
    const message = event.data;
    if (message.command === 'setTime'||message.command==='rgb') {
        const sentTime = message.time;
        const currentTime = new Date().getTime();
        const delay = currentTime - sentTime;
        const resultElement = document.getElementById('result');
        resultElement.textContent = `延迟: ${delay} 毫秒`;
        ci._events.consumers.frame.forEach(f=>f(message.data,message.data))
    }
    if(message.command==="ci"){
        ci._width=message.width
        ci._height=message.height
        webGl(document.getElementById("layout"),ci)
    }
});

// 顶点着色器源代码
const vsSource = `
attribute vec4 aVertexPosition;
attribute vec2 aTextureCoord;

varying highp vec2 vTextureCoord;

void main(void) {
  gl_Position = aVertexPosition;
  vTextureCoord = aTextureCoord;
}
`;

// 片段着色器源代码
const fsSource = `
varying highp vec2 vTextureCoord;
uniform sampler2D uSampler;

void main(void) {
  highp vec4 color = texture2D(uSampler, vTextureCoord);
  gl_FragColor = vec4(color.r, color.g, color.b, 1.0);
}
`;

// WebGL 主函数
function webGl(canvas, ci) {
    const layers=canvas.parentElement
    const gl = canvas.getContext("webgl");

    // 检查是否成功创建 WebGL 上下文
    if (gl === null) {
        throw new Error("Unable to create webgl context on given canvas");
    }

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    const vertexPosition = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    const textureCoord = gl.getAttribLocation(shaderProgram, "aTextureCoord");
    const uSampler = gl.getUniformLocation(shaderProgram, "uSampler");

    initBuffers(gl, vertexPosition, textureCoord);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const pixel = new Uint8Array([0, 0, 0]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, pixel);

    gl.useProgram(shaderProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(uSampler, 0);

    let containerWidth = layers.width;
    let containerHeight = layers.height;
    let frameWidth = 0;
    let frameHeight = 0;

    // 处理画布大小调整的函数
    const onResize = () => {
        const aspect = frameWidth / frameHeight;
        let width = containerWidth;
        let height = containerWidth / aspect;

        if (height > containerHeight) {
            height = containerHeight;
            width = containerHeight * aspect;
        }

        canvas.style.position = "relative";
        canvas.style.top = (containerHeight - height) / 2 + "px";
        canvas.style.left = (containerWidth - width) / 2 + "px";
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
    };

    // 处理图层大小调整的函数
    const onResizeLayer = (w, h) => {
        containerWidth = w;
        containerHeight = h;
        onResize();
    };

    // layers.addOnResize(onResizeLayer);

    // 处理帧大小调整的函数
    const onResizeFrame = (w, h) => {
        frameWidth = w;
        frameHeight = h;
        canvas.width = frameWidth;
        canvas.height = frameHeight;
        gl.viewport(0, 0, frameWidth, frameHeight);
        onResize();
    };

    ci.events().onFrameSize(onResizeFrame);
    onResizeFrame(ci.width(), ci.height());

    let requestAnimationFrameId = null;
    let frame = null;
    let frameFormat = 0;

    // 处理帧数据的函数
    ci.events().onFrame((rgb, rgba) => {
        frame = rgb != null ? rgb : rgba;
        frameFormat = rgb != null ? gl.RGB : gl.RGBA;

        if (requestAnimationFrameId === null) {
            requestAnimationFrameId = requestAnimationFrame(updateTexture);
        }
    });

    // 更新纹理的函数
    const updateTexture = () => {
        gl.texImage2D(gl.TEXTURE_2D, 0, frameFormat, frameWidth, frameHeight, 0, frameFormat, gl.UNSIGNED_BYTE, frame);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        requestAnimationFrameId = null;
        frame = null;
    };

    // 处理退出事件的函数
    ci.events().onExit(() => {
        layers.removeOnResize(onResizeLayer);
    });
}

// 初始化着色器程序的函数
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        throw new Error("Unable to initialize the shader program: " + gl.getProgramInfoLog(shaderProgram));
    }

    return shaderProgram;
}

// 加载着色器的函数
function loadShader(gl, shaderType, source) {
    const shader = gl.createShader(shaderType);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error("An error occurred compiling the shaders: " + info);
    }

    return shader;
}

// 初始化缓冲区的函数
function initBuffers(gl, vertexPosition, textureCoord) {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const positions = [
        -1.0, -1.0, 0.0,
        1.0, -1.0, 0.0,
        1.0, 1.0, 0.0,
        -1.0, -1.0, 0.0,
        1.0, 1.0, 0.0,
        -1.0, 1.0, 0.0,
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vertexPosition);

    const textureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);

    const textureCoordinates = [
        0.0, 1.0,
        1.0, 1.0,
        1.0, 0.0,
        0.0, 1.0,
        1.0, 0.0,
        0.0, 0.0,
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);
    gl.vertexAttribPointer(textureCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(textureCoord);
}    


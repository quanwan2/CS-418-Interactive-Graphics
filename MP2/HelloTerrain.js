
var gl;
var canvas;
var shaderProgram;
var vertexPositionBuffer;

// Create a place to store terrain geometry
var tVertexPositionBuffer;

//Create a place to store normals for shading
var tVertexNormalBuffer;

// Create a place to store the terrain triangles
var tIndexTriBuffer;

//Create a place to store the traingle edges
var tIndexEdgeBuffer;

// Corresponding Texture Buffer
var sceneTextureCoordBuffer;


// units per second
var airSpeed = 0.2;
// degrees per second
var turnSpeed = 35.0;
// keep track of the last time movement was processed, in microseconds
var lastFrame = -1;

var useLighting = true;

//--------------- Handle KeyBoard Actions ----------------------------------
var keysDown = {};

function handleKeyDown(event) {
  if(event.keyCode == 76)
    useLighting = !useLighting;
  keysDown[event.keyCode] = true;
}

function handleKeyUp(event) {
  keysDown[event.keyCode] = false;
}

//--------------------------------------------------------------------------

// View parameters

var ROLL = 0;

var YAW = 0;

var PITCH = 0;

// Eye point is at (0.0, 0.0, 0.0).
var eyePt = vec3.fromValues(0.0,0.0,0.0);
// View direction is -z.
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
// up is y
var up = vec3.fromValues(0.0,1.0,0.0);

var viewPt = vec3.fromValues(0.0,0.0,0.0);

var orbitRotation = quat.create();

var eyeRotation = quat.create();

var ORBITmat = mat4.create();

var EYEmat = mat4.create(); 

// Create the normal
var nMatrix = mat3.create();

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

var mvMatrixStack = [];


//-------------------------------------------------------------------------
function setupTerrainBuffers() {
    
    var vTerrain=[];
    var fTerrain=[];
    var nTerrain=[];
    var eTerrain=[];
    var gridN = 256;
    
    var numT = terrainFromIteration(gridN, -20, 20, -20, 20, vTerrain, fTerrain, nTerrain);
    
    console.log(generateTextureCoords(gridN).length);
    console.log("Generated ", numT, " triangles"); 
    
    tVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);      
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vTerrain), gl.STATIC_DRAW);
    tVertexPositionBuffer.itemSize = 3;
    tVertexPositionBuffer.numItems = (gridN + 1)*(gridN + 1);
    
    // Specify normals to be able to do lighting calculations
    tVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nTerrain),
                  gl.STATIC_DRAW);
    tVertexNormalBuffer.itemSize = 3;
    tVertexNormalBuffer.numItems = (gridN + 1)*(gridN + 1);
    
    // Specify faces of the terrain 
    tIndexTriBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(fTerrain),
                  gl.STATIC_DRAW);
    tIndexTriBuffer.itemSize = 1;
    tIndexTriBuffer.numItems = numT*3;

    // Do the same thing for "sceneTextureCoordBuffer"
    sceneTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sceneTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(generateTextureCoords(gridN)), 
                  gl.STATIC_DRAW);
    sceneTextureCoordBuffer.itemSize = 2;
    sceneTextureCoordBuffer.numItems = (gridN + 1)*(gridN + 1);

    // Setup Edges
     generateLinesFromIndexedTriangles(fTerrain,eTerrain);  
     tIndexEdgeBuffer = gl.createBuffer();
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexEdgeBuffer);
     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(eTerrain),
                  gl.STATIC_DRAW);
     tIndexEdgeBuffer.itemSize = 1;
     tIndexEdgeBuffer.numItems = eTerrain.length;

     // Put the mvMatrix in the right place 
     // mat4.lookAt(mvMatrix, [0, 0, 0], [0, 0, 0], [0, 0, -1]);
     mat4.lookAt(mvMatrix, eyePt, viewPt, up);
     
}


//-------------------------------------------------------------------------
function drawTerrain(){
 
 gl.polygonOffset(0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

 // Remember we have a new buffer to bind => sceneTextureCoordBuffer 
 gl.bindBuffer(gl.ARRAY_BUFFER, sceneTextureCoordBuffer);
 gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, sceneTextureCoordBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);


 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);


 gl.activeTexture(gl.TEXTURE0);
 gl.bindTexture(gl.TEXTURE_2D, cloudTexture);
 gl.uniform1i(shaderProgram.cloudTextureSamplerUniform, 0);


 //Draw 
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
 gl.drawElements(gl.TRIANGLES, tIndexTriBuffer.numItems, gl.UNSIGNED_SHORT,0);  


}

//-------------------------------------------------------------------------
function drawTerrainEdges(){
 gl.polygonOffset(1,1);
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);

 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexEdgeBuffer);
 gl.drawElements(gl.LINES, tIndexEdgeBuffer.numItems, gl.UNSIGNED_SHORT,0);


}

//-------------------------------------------------------------------------
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

//-------------------------------------------------------------------------
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}

//----------------------------------------------------------------------------------
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}


//----------------------------------------------------------------------------------
function generateTextureCoords(side) {
  var coords = [];
  for(var i = 0; i < side; i++) { // y
    for(var j = 0; j < side; j++) { // x
      coords[xyToi(j, i, side, 2)] = j / side;
      coords[xyToi(j, i, side, 2) + 1] = i / side;
      if(coords[xyToi(j, i, side, 2)] < 0.0 || coords[xyToi(j, i, side, 2) + 1] < 0.0)
        console.log("texture coords are hard");
    }
  }
  return coords;
}
//----------------------------------------------------------------------------------

function xyToi(x, y, width, skip) {
  return skip * (width * y + x);
}

//----------------------------------------------------------------------------------



function setupTextures() {

  cloudTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, cloudTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
              new Uint8Array([128, 128, 128, 1.8]));
}
//----------------------------------------------------------------------------------

function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}

function handleLoadedTexture(width,height) {

  if(isPowerOf2(width) && isPowerOf2(height))
  {
     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
     gl.generateMipmap(gl.TEXTURE_2D);
  }
  else
  {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }

    gl.bindTexture(gl.TEXTURE_2D, null);
}

//----------------------------------------------------------------------------------
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

//----------------------------------------------------------------------------------

function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

//----------------------------------------------------------------------------------
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.cloudTextureSamplerUniform = gl.getUniformLocation(shaderProgram, "ucloudTexture");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");

}


//-------------------------------------------------------------------------
function uploadLightsToShader(loc, a, d, s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//----------------------------------------------------------------------------------
function setupBuffers() {
    setupTerrainBuffers();
}

//----------------------------------------------------------------------------------
function draw() { 
    var transformVec = vec3.create();
  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

    // We want to look down -z, so create a lookat point in that direction    
    // vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    // mat4.lookAt(mvMatrix,eyePt,viewPt,up);    
 
    //Draw Terrain
    mvPushMatrix();
    vec3.set(transformVec, 0.0, -0.25, -3.0);
    mat4.translate(mvMatrix, mvMatrix,transformVec);
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(-75));
    mat4.rotateZ(mvMatrix, mvMatrix, degToRad(25));     
    setMatrixUniforms();
    
    // if ((document.getElementById("polygon").checked) || (document.getElementById("wirepoly").checked))
    // {
    //   uploadLightsToShader([0,1,1],[0.0,0.0,0.0],[1.0,0.5,0.0],[0.0,0.0,0.0]);
    //   drawTerrain();
    // }
    
    // if(document.getElementById("wirepoly").checked){
    uploadLightsToShader([0,1,1],[1.0,1.0,1.0],[1.0,1.0,1.0],[1.0,1.0,1.0]);
    drawTerrain();
    // }

    // if(document.getElementById("wireframe").checked){
    //   uploadLightsToShader([0,1,1],[1.0,1.0,1.0],[0.0,0.0,0.0],[0.0,0.0,0.0]);
    //   drawTerrainEdges();
    // }
    mvPopMatrix();
  
}

function update(){    

    var eye = vec3.create();  
    vec3.sub(eye, eyePt , viewPt);
    mat4.fromRotationTranslation(ORBITmat, orbitRotation, viewPt);
    mat4.fromRotationTranslation(EYEmat,   eyeRotation,   eye);        
    mat4.multiply(mvMatrix, ORBITmat, EYEmat);

}
   

function moveEye(direction, velocity) {
    vec3.scale(direction, direction, velocity);
    vec3.subtract(eyePt , eyePt , direction);
}

function getEyeForwardVector() {
    
    var q  = eyeRotation;
    var qx = q[0], qy = q[1], qz = q[2], qw = q[3];
    var x =     2 * (qx * qz + qw * qy);
    var y =     2 * (qy * qx - qw * qx);
    var z = 1 - 2 * (qx * qx + qy * qy);

    return vec3.fromValues(x, y, z);
}

function getEyeBackwardVector() {
    var v = getEyeForwardVector();
    vec3.negate(v, v);
    return v;
}    

function getEyeRightVector() {
  
  var q  = eyeRotation;
  var qx = q[0], qy = q[1], qz = q[2], qw = q[3];
  var x = 1 - 2 * (qy * qy + qz * qz);
  var y =     2 * (qx * qy + qw * qz);
  var z =     2 * (qx * qz - qw * qy);

  return vec3.fromValues(x, y, z);
}

function getEyeLeftVector() {
  var v = getEyeRightVector();
  vec3.negate(v, v);
  return v;
}

function getEyeUpVector() {
  
  var q  = eyeRotation;
  var qx = q[0], qy = q[1], qz = q[2], qw = q[3];
  var x =     2 * (qx * qy - qw * qz);
  var y = 1 - 2 * (qx * qx + qz * qz);
  var z =     2 * (qy * qz + qw * qx);

  return vec3.fromValues(x, y, z);
}

function getEyeDownVector() {
    var v = getEyeUpVector();
    vec3.negate(v, v);
    return v;
}

function moveEyeForward(velocity) {
    
    var dir   = vec3.fromValues(0, 0, 0);
    var right = getEyeRightVector();
    vec3.cross(dir, right, up);
    vec3.normalize(dir, dir);
    moveEye(dir, velocity);
}

function moveEyeBackward (velocity) {
    
    var dir = vec3.fromValues(0, 0, 0);
    var right = getEyeRightVector();
    vec3.cross(dir, right, up);
    vec3.normalize(dir, dir);
    vec3.negate(dir, dir);
    moveEye(dir, velocity); 
}   

function moveEyeLeft(velocity) {
    moveEye(getEyeLeftVector(), velocity);
}

function moveEyeRight(velocity) {
  moveEye(getEyeRightVector(), velocity);
}    

function moveEyeUp(velocity) {
  eyePt [1] += velocity;
    
}

function moveEyeDown (velocity) {
    eyePt [1] -= velocity;
    
}
   
function changeEyeYaw(amount) {    
  ROLL = quat.create();    
  quat.setAxisAngle(ROLL , up, amount);
  quat.multiply(eyeRotation, ROLL , eyeRotation);
  ROLL  += amount;
  update();
}

function changeEyePitch(amount) {
  quat.rotateX(eyeRotation, eyeRotation, amount);
  quat.normalize(eyeRotation, eyeRotation);
  update();
}

function changeEyeRoll(amount) { 
  ROLL = quat.create();    
  quat.setAxisAngle(ROLL , [0,0,1], amount);
  quat.multiply(eyeRotation, ROLL , eyeRotation);
  ROLL += amount;
  update();
}

//----------------------------------------------------------------------------------
function animate() {
  var current = new Date().getTime();
  if(lastFrame == -1)
    lastFrame = current;
  // we want the time in seconds for simplicity
  var delta = (current - lastFrame) / 800.0;
  lastFrame = current;

  var DIR = [0, 0, 1.5];

 
  // Roll --> X
  if(keysDown[68]) {
    changeEyeYaw(delta*0.1);
  }

  if(keysDown[65]) {
    changeEyeYaw(-delta*0.1); 
  }

  // Pitch --> Y
  if (keysDown[38]){
    changeEyePitch(delta*0.1);
  }

  if (keysDown[40]){
    changeEyePitch(-delta*0.1);
  }

  // Yaw --> Z
  if (keysDown[37]){
    changeEyeRoll(delta*0.1);
  }
  
  if (keysDown[39]){
    changeEyeRoll(-delta*0.1);
  }
    
   vec3.scale(DIR, DIR, delta);
   var position=vec3.create();
   vec3.add(position, position, DIR);
   mat4.translate(mvMatrix, mvMatrix, position);
   
}

//----------------------------------------------------------------------------------
function startup() {
  canvas = document.getElementById("myGLCanvas");
  // Create GL context
  gl = createGLContext(canvas);
  // Set up Buffers
  setupShaders();
  setupBuffers();
  setupTextures();

  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

//------------- Handle KeyBoard Actions -------------
  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;


  tick();
}

//----------------------------------------------------------------------------------
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}


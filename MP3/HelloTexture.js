
var gl;
var canvas;

var shaderProgram;
var shaderProgram1;
// For the teapot
var vertexNormalBuffer
var vertexPositionBuffer;
var vertexIndexBuffer;
var vertexColorBuffer;
// For the terrain
var tVertexPositionBuffer;
var tVertexNormalBuffer;
var tIndexTriBuffer;
var sceneTextureCoordBuffer


var terrain_texture;
var environment;
var mvMatrix = mat4.create();


var pMatrix = mat4.create();
var mvMatrix1 = mat4.create();
var pMatrix1 = mat4.create();

var mvMatrixStack = [];
var mvMatrixStack1 = [];


var then = 0;
var modelYRotationRadians = degToRad(0);

//----------------------------------------------------------------------------------
var lightPosition = vec3.fromValues(0, 1, 1);
var ambient = vec3.fromValues(0.1, 0.1, 0.1);
var diffuse = vec3.fromValues(1.0, 0.0, 0.0);
var specular= vec3.fromValues(1.0, 0.0, 0.0);

//-------------------------------------------------------------------------
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
}
//-------------------------------------------------------------------------

function uploadNormalMatrixToShader() {
  var a = mat3.create();
  var b = mat3.create();
  var normalMatrix = mat3.create();
  mat3.fromMat4(a, mvMatrix);
  mat3.invert(b, a);
  mat3.transpose(normalMatrix, b);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
}

//--------------------------------------------------------------------------
function uploadLightsTerrain(location, ambient, diffuse, specular){
  gl.uniform3fv(shaderProgram1.uniformLightPositionLoc, location);
  gl.uniform3fv(shaderProgram1.uniformAmbientLightColorLoc, ambient);
  gl.uniform3fv(shaderProgram1.uniformDiffuseLightColorLoc, diffuse);
  gl.uniform3fv(shaderProgram1.uniformSpecularLightColorLoc, specular);
}

function uploadLightsTeapot(location, ambient, diffuse, specular){
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, location);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, ambient);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, diffuse);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, specular);
}

//----------------------------------------------------------------------------------
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}

function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}
//----------------------------------------------------------------------------------

function mvPushMatrix1() {
   var copy =mat4.clone(mvMatrix1);
   mvMatrixStack1.push(copy);
}

function mvPopMatrix1() {
    if(mvMatrixStack1.length ==0){
      throw "Invalid popMatrix!";
    }
    mvMatrix1 = mvMatrixStack1.pop();
}

//----------------------------------------------------------------------------------
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadProjectionMatrixToShader();
    // since we now have NMatrix
    uploadNormalMatrixToShader();
}
//----------------------------------------------------------------------------------

function setMatrixUniformsforTerrain(){
    var normalMat= mat3.create();
    gl.uniformMatrix4fv(shaderProgram1.mvMatrixUniform, false, mvMatrix1);
    gl.uniformMatrix4fv(shaderProgram1.pMatrixUniform, false, pMatrix1);
    mat3.fromMat4(normalMat,mvMatrix1);
    mat3.transpose(normalMat,normalMat);
    mat3.invert(normalMat,normalMat);
    gl.uniformMatrix3fv(shaderProgram1.nMatrixUniform, false, normalMat);

}

//----------------------------------------------------------------------------------
function degToRad(degrees) {
        return degrees * Math.PI / 180;
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

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  console.log("Normal attrib: ", shaderProgram.vertexNormalAttribute);
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
    
  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  console.log("Vertex attrib: ", shaderProgram.vertexPositionAttribute);
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");

  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");

  shaderProgram.cubeMapSampler = gl.getUniformLocation(shaderProgram, "uCubeSampler");

  
  gl.useProgram(shaderProgram);
  
}


function setupShaders1(){
  
  var vertexShader1 =loadShaderFromDOM("terrain-vs");
  var fragmentShader1 =loadShaderFromDOM("terrain-fs");
  shaderProgram1 = gl.createProgram();
  gl.attachShader(shaderProgram1, vertexShader1);
  gl.attachShader(shaderProgram1, fragmentShader1);
  gl.linkProgram(shaderProgram1);

  if (!gl.getProgramParameter(shaderProgram1, gl.LINK_STATUS)){
    alert("Failed to setup terrainshaders");
  }

 
  gl.useProgram(shaderProgram1);

  shaderProgram1.vertexNormalAttribute =gl.getAttribLocation(shaderProgram1, "aVertexNormal1");
  console.log("Vex norm attrib: ", shaderProgram1.vertexNormalAttribute);
  gl.enableVertexAttribArray(shaderProgram1.vertexNormalAttribute);

  shaderProgram1.vertexPositionAttribute = gl.getAttribLocation(shaderProgram1, "aVertexPosition1");
  console.log("Vertex Position attrib: ", shaderProgram1.vertexPositionAttribute);
  gl.enableVertexAttribArray(shaderProgram1.vertexPositionAttribute);

  shaderProgram1.textureCoordAttribute = gl.getAttribLocation(shaderProgram1, "aTexCoord");
  gl.enableVertexAttribArray(shaderProgram1.textureCoordAttribute);

  shaderProgram1.mvMatrixUniform = gl.getUniformLocation(shaderProgram1, "uMVMatrix1");
  shaderProgram1.pMatrixUniform = gl.getUniformLocation(shaderProgram1, "uPMatrix1");
  shaderProgram1.nMatrixUniform = gl.getUniformLocation(shaderProgram1, "uNMatrix1");
  shaderProgram1.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram1, "uLightPosition");    
  shaderProgram1.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram1, "uAmbientLightColor");  
  shaderProgram1.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram1, "uDiffuseLightColor");
  shaderProgram1.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram1, "uSpecularLightColor");
  shaderProgram1.TextureSamplerUniform = gl.getUniformLocation(shaderProgram1, "uImage");

    
}

//-----------------------------------------------------------------------------------
function drawTeapot(){

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, environment);
  gl.uniform1i(shaderProgram.cubeMapSampler, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexNormalBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);
  
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexIndexBuffer);
  gl.drawElements(gl.TRIANGLES, 6768, gl.UNSIGNED_SHORT, 0);

}

//-------------------------------------------------------

// Get From MP2 -- Terrain Generation
function setupTerrainBuffers() {
    
    var vTerrain=[];
    var fTerrain=[];
    var nTerrain=[];
    var eTerrain=[];
    var gridN = 64;
    
    var numT = terrainFromIteration(gridN, -2, 2, -2, 2, vTerrain, fTerrain, nTerrain);
    console.log("Generated ", numT, " triangles"); 
    tVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);      
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vTerrain), gl.STATIC_DRAW);
    tVertexPositionBuffer.itemSize = 3;
    tVertexPositionBuffer.numItems = (gridN+1)*(gridN+1);
    
    // Specify normals to be able to do lighting calculations
    tVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nTerrain),
                  gl.STATIC_DRAW);
    tVertexNormalBuffer.itemSize = 3;
    tVertexNormalBuffer.numItems = (gridN+1)*(gridN+1);
    
    // Specify faces of the terrain 
    tIndexTriBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(fTerrain),
                  gl.STATIC_DRAW);
    tIndexTriBuffer.itemSize = 1;
    tIndexTriBuffer.numItems = numT*3;

    sceneTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sceneTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(generateTextureCoords(gridN)), gl.STATIC_DRAW);
    sceneTextureCoordBuffer.itemSize = 2;
    sceneTextureCoordBuffer.numItems = (gridN+1)*(gridN+1);
    console.log(sceneTextureCoordBuffer.numItems);  
     
}

//-------------------------------------------------------
function xyToi(x, y, width, skip) {
  return skip * (width * y + x);
}

//-------------------------------------------------------
function generateTextureCoords(side) {
  var coords = [];
  for(var i = 0; i <=side; i++) { // y
    for(var j = 0; j<=side; j++) { // x
      coords[xyToi(j, i, side+1, 2)] = j / side;
      coords[xyToi(j, i, side+1, 2) + 1] = i / side;
      if(coords[xyToi(j, i, side, 2)] < 0.0 || coords[xyToi(j, i, side, 2) + 1] < 0.0)
        console.log("texture coords are hard");
    }
  }
  return coords;
}

//-------------------------------------------------------
function setupTextures() {

  terrain_texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, terrain_texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
              new Uint8Array([255, 0, 0, 255]));
  var image = new Image();
  
  image.onload = function() {
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.bindTexture(gl.TEXTURE_2D, terrain_texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    handleLoadedTexture(image.width,image.height);
  }
  // we use the Test.jpg as our heightMap Image
   image.src = 'Test.jpg';
}

function handleLoadedTexture(width,height) {

  
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  
    gl.bindTexture(gl.TEXTURE_2D, null);
  
}

//------------------------------------------------------------------------------
// Get from MP2
function drawTerrain(){
 gl.polygonOffset(0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram1.vertexPositionAttribute, tVertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram1.vertexNormalAttribute, 
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
 
  gl.bindBuffer(gl.ARRAY_BUFFER, sceneTextureCoordBuffer);
  gl.vertexAttribPointer(shaderProgram1.textureCoordAttribute, sceneTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, terrain_texture);
  gl.uniform1i(shaderProgram1.TextureSamplerUniform, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
  gl.drawElements(gl.TRIANGLES, tIndexTriBuffer.numItems, gl.UNSIGNED_SHORT,0);      
}

//----------------------------------------------------------------------------------


function draw1(){

    var transformVec = vec3.create();

    mat4.perspective(pMatrix1,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0, pMatrix1);
    //console.log("380");
    mvPushMatrix1();
    vec3.set(transformVec, 0.0, -1.25, -18);
   
    mat4.translate(mvMatrix1, mvMatrix1,transformVec);
    mat4.rotateX(mvMatrix1, mvMatrix1, degToRad(-75));
    mat4.rotateZ(mvMatrix1, mvMatrix1, degToRad(25)); 

    setMatrixUniformsforTerrain();
    // uploadLightsTerrain([0,1,1],[0.0,0.0,0.0],[1.0,0.5,0.0],[0.0,0.0,0.0]);
    drawTerrain();
    mvPopMatrix1();

}


//--------------------------------------------------------------------------------------
// Set up Cube_MAP
        
function initEnvironmentCubeMap() {
  environment = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, environment);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  
  console.log(gl.getParameter(gl.MAX_TEXTURE_SIZE));

  var cubeFaces = [
    ["posx.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_X],
    ["negx.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_X],
    ["posy.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_Y],
    ["negy.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_Y],
    ["posz.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_Z],
    ["negz.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_Z]
  ];

  for (var i = 0; i < cubeFaces.length; i++) {

      var image = new Image();
      image.src = cubeFaces[i][0];
      image.onload = function(texture, face, image) {

          return function() {
              gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
              gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture)
              gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
              gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
          }
      } (environment, cubeFaces[i][1], image);
  }
};

//----------------------------------------------------------------------------------
function animate() {
    if (then==0)
    {
        then = Date.now();
    }
    else
    {
        now=Date.now();
        // Convert to seconds
        now *= 0.001;
        // Subtract the previous time from the current time
        var deltaTime = now - then;
        // Remember the current time for the next frame.
        then = now;

        //Animate the rotation
        modelYRotationRadians += 0.7 * deltaTime;
        modelYRotationRadians += 0.7 * deltaTime;  
    }
}


//-------------------------------------------------------

function loadteapot(){
    $.get('teapot_0.obj', function(data) {
    handleLoadedModel(computeNormsTexCoords(readFile(data)));
    ready = true;
  });
}

//-------------------------------------------------------
// Similar to the online WebGL tutorial
function computeNormsTexCoords(data) {
    var num_vertices = data.vertices.length / 3;
    var num_faces = data.faceindex.length / 3;
    var triangles = new Array(num_faces);
    var vertexIndices = new Array(num_vertices);

    for(var i = 0; i < vertexIndices.length; i++)
        vertexIndices[i] = new Array();


    for(var i = 0; i < num_faces; i++) {
        // indices of the indices of the vertices
        var idx1 = 3 * i;
        var idx2 = 3 * i + 1;
        var idx3 = 3 * i + 2;
        // indices of the vertices
        var vi1 = data.faceindex[idx1] * 3;
        var vi2 = data.faceindex[idx2] * 3;
        var vi3 = data.faceindex[idx3] * 3;
        // use 3 actual three coordinates to remake the three vertices
        var v1 = [data.vertices[vi1], data.vertices[vi1 + 1], data.vertices[vi1 + 2]];
        var v2 = [data.vertices[vi2], data.vertices[vi2 + 1], data.vertices[vi2 + 2]];
        var v3 = [data.vertices[vi3], data.vertices[vi3 + 1], data.vertices[vi3 + 2]];

        
        var normal = vec3.create();
        var normalized = vec3.create();

        var u = vec3.create();
        var v = vec3.create();
        vec3.subtract(u, v2, v1);
        vec3.subtract(v, v3, v1);
        vec3.cross(normal, u, v);
        vec3.normalize(normalized, normal);

        triangles[i] = normalized;
        vertexIndices[vi1 / 3].push(i);
        vertexIndices[vi2 / 3].push(i);
        vertexIndices[vi3 / 3].push(i);
    }
    // Average the normals of all adjacent faces
    for(var i = 0; i < num_vertices; i++) {
        var totalNormal = vec3.create();
        var temp = vec3.create();
        while(vertexIndices[i].length !== 0) {
            var currentTriangle = vertexIndices[i].pop();
            vec3.add(temp, totalNormal, triangles[currentTriangle]);
            vec3.copy(totalNormal, temp);
        }
        var normalized = vec3.create();
        vec3.normalize(normalized, totalNormal);
        data.vertexNormals[i * 3] = normalized[0];
        data.vertexNormals[i * 3 + 1] = normalized[1];
        data.vertexNormals[i * 3 + 2] = normalized[2];
        
    }
    return data;
}

//----------------------------------------------------------------------------------
function handleLoadedModel(data) {

  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.vertices), gl.STATIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  vertexPositionBuffer.numItems = data.vertices.length / 3;
  console.log("found " + vertexPositionBuffer.numItems + " vertices");

  vertexNormalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexNormalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.vertexNormals), gl.STATIC_DRAW);
  vertexNormalBuffer.itemSize = 3;
  vertexNormalBuffer.numItems = data.vertexNormals.length / 3;
  console.log("found " + vertexNormalBuffer.numItems + " normals");

  vertexIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data.faceindex), gl.STATIC_DRAW);
  vertexIndexBuffer.itemSize = 1;
  vertexIndexBuffer.numItems = data.faceindex.length;
  console.log("found " + vertexIndexBuffer.numItems / 1 + " indices");

  vertexColorBuffer= gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.colors), gl.STATIC_DRAW);
  vertexColorBuffer.itemSize=4;
  vertexColorBuffer.numItems=data.colors.length/4;
  console.log("found "+ vertexColorBuffer.numItems + " colors" );
  
}

//----------------------------------------------------------------------------------
function draw() { 
    var transformVec = vec3.create();
  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // Here we apply the perspective view
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0, pMatrix);
 
    mvPushMatrix();

    
    vec3.set(transformVec, -2, 0.8, -12);
    mat4.translate(mvMatrix, mvMatrix,transformVec);
    mat4.rotateY(mvMatrix,mvMatrix,modelYRotationRadians);
    mat4.rotateX(mvMatrix,mvMatrix,modelYRotationRadians);
    setMatrixUniforms();
    uploadLightsTeapot([1,1,1],[0,0.0,0.0],[0.3,0,0],[0,1.0,0]);
    drawTeapot();
    mvPopMatrix();

}

//----------------------------------------------------------------------------------
function startup() {
  
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  setupShaders();
  loadteapot();
  initEnvironmentCubeMap(); 
  setupShaders1();
  setupTerrainBuffers();
  setupTextures();
  tick();

  
}

//----------------------------------------------------------------------------------
function tick() {

    // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    requestAnimFrame(tick);
    // We have 2 shaderPrograms and render them in sequence
    gl.useProgram(shaderProgram);
    //uploadLightsTeapot(lightPosition, ambient, diffuse, specular);
    draw();
    gl.useProgram(shaderProgram1);
    draw1();
    // Animate before next draw
    animate();
}


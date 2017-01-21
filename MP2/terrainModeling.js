
// Constructor for Terrain with 1-parameter
function Terrain(n){
  // n => n+1 vertices
  this.size = n + 1;
  this.max = n;
  this.init_height = 2;
  this.terrain = new Float32Array( (n+2)*(n+1) );
  //this.generate();
  var self = this;

  self.set(0, 0, self.init_height);
  self.set(self.max, 0, self.init_height);
  self.set(self.max, self.max, self.init_height);
  self.set(0, self.max, self.init_height);

  Diamond_Square(0, 0, self.max, self.max, self.init_height);
//----------------- Diamond_Square Algorithm ----------------------------------
  function Diamond_Square(minX, maxY, maxX, minY, base_height) {
    var x_centre = Math.floor((minX + maxX) / 2);
    var y_centre = Math.floor((maxY + minY) / 2);
    var Center_Height = 
      (
        self.get(minX, maxY) +
        self.get(maxX, maxY) +
        self.get(minX, minY) +
        self.get(maxX, minY)
      ) / 4
        - (Math.random() - 0.5) * base_height * 2;
   
      self.sset(x_centre, y_centre, Center_Height);
      self.sset(x_centre, maxY, (self.get(minX, maxY) + self.get(maxX, maxY)) / 2 + (Math.random() - 0.5) * base_height);
      self.sset(x_centre, minY, (self.get(minX, minY) + self.get(maxX, minY)) / 2 + (Math.random() - 0.5) * base_height);
      self.sset(minX, y_centre, (self.get(minX, maxY) + self.get(minX, minY)) / 2 + (Math.random() - 0.5) * base_height);
      self.sset(maxX, y_centre, (self.get(maxX, maxY) + self.get(maxX, minY)) / 2 + (Math.random() - 0.5) * base_height);
      // Hit the Basecase Or Continue Recursion
      if (maxX - minX> 2)
          base_height = base_height*Math.pow(2.0, -0.75);
      else
          return;

      Diamond_Square(minX, maxY, x_centre, y_centre, base_height);
      Diamond_Square(x_centre, maxY, maxX, y_centre, base_height);
      Diamond_Square(minX, y_centre, x_centre, minY, base_height);
      Diamond_Square(x_centre, y_centre, maxX, minY, base_height);

  }
}


//----------------- Instance Functions ----------------------------------
Terrain.prototype.get = function(x, y){
  return this.terrain[x + this.size * y];
};

Terrain.prototype.set = function(x, y, val){
  this.terrain[x + this.size * y] = val;
};

Terrain.prototype.sset = function(x,y,val){
   if (this.get(x,y) == 0){
    this.terrain[x + this.size * y] = val;
  };
}
//------------------------------------------------------------------------

function terrainFromIteration(n, minX, maxX, minY, maxY, vertexArray, faceArray, normalArray)
{   
    var width = maxX-minX;
    var height = maxY-minY;
    var deltaX = width/n;
    var deltaY = height/n;
    var scene = new Terrain(n);
    
    for(var i=0;i<=n;i++)
       for(var j=0;j<=n;j++)
       {   
           var x = minX + deltaX*j;
           var y = minY + deltaY*i;

           var val = scene.get(j,i);
           
           vertexArray.push(x);
           vertexArray.push(y);
           vertexArray.push(-val);

        }
    // Calculate normal vectors.
    var UP = vec3.create();
    var DOWN = vec3.create();
    var LEFT = vec3.create();
    var RIGHT = vec3.create();
    var current = vec3.create();
    
    for(var i=0;i<=n;i++)
       for(var j=0;j<=n;j++){
     
        if(j!=0){
          DOWN[0] =vertexArray[((n+1)*(j-1)+i)*3];
          DOWN[1] =vertexArray[((n+1)*(j-1)+i)*3+1];
          DOWN[2] =vertexArray[((n+1)*(j-1)+i)*3+2];
        }
        if(i!=0){
          LEFT[0]=vertexArray[((n+1)*j+i-1)*3];
          LEFT[1] =vertexArray[((n+1)*j+i-1)*3+1];
          LEFT[2] =vertexArray[((n+1)*j+i-1)*3+2];
        }
        if(j!=n){
          UP[0]=vertexArray[((n+1)*(j+1)+i)*3];
          UP[1]=vertexArray[((n+1)*(j+1)+i)*3+1];
          UP[2]=vertexArray[((n+1)*(j+1)+i)*3+2];
        }
        if(i!=n){
          RIGHT[0]=vertexArray[((n+1)*j+i+1)*3];
          RIGHT[1]=vertexArray[((n+1)*j+i+1)*3+1];
          RIGHT[2]=vertexArray[((n+1)*j+i+1)*3+2]; 
        }
        current[0]=vertexArray[((n+1)*j+i)*3];
        current[1]=vertexArray[((n+1)*j+i)*3+1];
        current[2]=vertexArray[((n+1)*j+i)*3+2];

        // Normal vector is the sum of all adjacent normal vectors
        var n1 = vec3.create();
        var n2 = vec3.create();
        var n3 = vec3.create();
        var n4 = vec3.create();
        
        var UPvector = vec3.fromValues(UP[0]-current[0], UP[1]-current[1], UP[2]-current[2]);
        var DOWNvector = vec3.fromValues(DOWN[0]-current[0], DOWN[1]-current[1], DOWN[2]-current[2]);
        var LEFTvector = vec3.fromValues(LEFT[0]-current[0], LEFT[1]-current[1], LEFT[2]-current[2]);
        var RIGHTvector = vec3.fromValues(RIGHT[0]-current[0], RIGHT[1]-current[1], RIGHT[2]-current[2]);

        if(i!=0 && j!=0)
          vec3.cross(n1, LEFTvector, DOWNvector);
        if(i!=0 && j!=n)
          vec3.cross(n2, UPvector, LEFTvector);
        if(i!=n && j!=0)
          vec3.cross(n3, DOWNvector, RIGHTvector);
        if(i!=n && j!=n)
          vec3.cross(n4, RIGHTvector, UPvector);
        // Normal vector is the sum of all 4 adjacent normal vectors
        var normal = vec3.create();
        vec3.add(normal, normal, n1);
        vec3.add(normal, normal, n2);
        vec3.add(normal, normal, n3);
        vec3.add(normal, normal, n4);

        vec3.normalize(normal, normal);
        normalArray.push(normal[0]);
        normalArray.push(normal[1]);
        normalArray.push(normal[2]);

       }

    var numT=0;
    for(var i=0;i<n;i++)
       for(var j=0;j<n;j++)
       {
           var vid = i*(n+1) + j;
           faceArray.push(vid);
           faceArray.push(vid+1);
           faceArray.push(vid+n+1);
           
           faceArray.push(vid+1);
           faceArray.push(vid+1+n+1);
           faceArray.push(vid+n+1);
           numT+=2;
       }
    return numT;
}
//-------------------------------------------------------------------------
function generateLinesFromIndexedTriangles(faceArray,lineArray)
{
    numTris=faceArray.length/3;
    for(var f=0;f<numTris;f++)
    {
        var fid=f*3;
        lineArray.push(faceArray[fid]);
        lineArray.push(faceArray[fid+1]);
        
        lineArray.push(faceArray[fid+1]);
        lineArray.push(faceArray[fid+2]);
        
        lineArray.push(faceArray[fid+2]);
        lineArray.push(faceArray[fid]);
    }
}




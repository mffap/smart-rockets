var population;
var lifespan = 350;
var count = 0;
var generation = 1;
var target;
var maxforce = 0.2;
var vlim = 4;
var mutationrate = 0.01;
var obstacles = [];

function setup() {
  createCanvas(400, 550);
  rocket = new Rocket();
  population = new Population();
  genP = createP();
  countP = createP();

  // build some obstacles
  for (var i = 0; i < 10; i++) {
    var o = new Obstacle();
    obstacles.push(o);
  }
  // setup target area
  target = createVector(width/2, 150);
}

function draw() {
  background(51);
  population.run();
  genP.html(generation)
  countP.html(count);
  count++;
  if(count == lifespan) {
    population.evaluate();
    population.selection();
    //population = new Population();
    count = 0;
    generation++;
  }
  fill(150);
  for (var i = 0; i < 10; i++) {
      ellipse(obstacles[i].pos.x, obstacles[i].pos.y,obstacles[i].r*2);
  }
  fill(255);
  ellipse(target.x, target.y, 16, 16);
}

function Obstacle() {
  this.r = random(10, 33);
  this.pos = createVector(random(0+this.r, width-this.r), random(0, height-50));
}


function Population() {
  this.rockets = [];
  this.size = 100;
  this.matingpool = [];

  for (var i = 0; i < this.size; i++) {
    this.rockets[i] = new Rocket();
  }

  this.evaluate = function() {
    var maxfit = 0;
    var minstep = lifespan;
    for (var i = 0; i < this.size; i++) {
      this.rockets[i].calcFitness();
      if(this.rockets[i].fitness > maxfit) {
        maxfit = this.rockets[i].fitness;
      }
      if((this.rockets[i].steps < minstep) && this.rockets[i].completed) {
        minstep = this.rockets[i].steps;
      }
    }

    if(minstep < lifespan) {
      console.log("minstep: " + minstep + "; fit: " + round(maxfit*1000)/1000);
    } else {
      console.log(maxfit);
    }
    // normalize (necessary?)
    for (var i = 0; i < this.size; i++) {
      this.rockets[i].fitness /= maxfit;
    }

    this.matingpool = [];
    for (var i = 0; i < this.size; i++) {
      var n = this.rockets[i].fitness *100;
      for (var j=0; j<n; j++) {
        this.matingpool.push(this.rockets[i]);
      }
    }
  }

  //Create child DNA
  this.selection = function() {
    var newRockets = [];
    for (var i = 0; i < this.rockets.length; i++) {
      //don't take the same
      var parentA = random(this.matingpool).dna;
      var parentB = random(this.matingpool).dna;
      var child = parentA.crossover(parentB);
      child.mutate();
      newRockets[i] = new Rocket(child);
    }
    this.rockets = newRockets;
  }

  this.run = function() {
    for (var i = 0; i < this.size; i++) {
      if(!this.rockets[i].completed || !this.rockets[i].crashed) {
        this.rockets[i].update();
      }
      this.rockets[i].show();
    }
  }
}

function DNA(genes) {
  if(genes) {
    this.genes = genes;
  } else {
    this.genes = [];

    for (var i = 0; i < lifespan; i++) {
      this.genes[i] = p5.Vector.random2D();
      this.genes[i].setMag(maxforce);
    }
  }

  this.crossover = function(partner) {
    var newgenes = [];
    var mid = floor(random(this.genes.length));
    for(var i = 0;i < this.genes.length; i++) {
      if (i > mid) {
        newgenes[i] = this.genes[i];
      } else {
        newgenes[i] = partner.genes[i];
      }
    }
    return new DNA(newgenes);
  }

  this.mutate = function() {
    for(var i = 0;i < this.genes.length; i++) {
      if(random(i) < mutationrate) {
        this.genes[i] = p5.Vector.random2D();
        this.genes[i].setMag(maxforce);
      }
    }
  }
}
function Rocket(dna) {
  this.pos = createVector(width/2, height-10);
  //this.vel = createVector(0,-1);
  //this.vel = p5.Vector.random2D();
  //this.vel = createVector(random(-1,1),random(-1,0));
  this.vel = createVector();
  this.acc = createVector();

  if(dna) {
    this.dna = dna;
  } else {
    this.dna = new DNA(); // give each rocket a DNA
  }

  this.fitness = 0;
  this.completed = false;
  this.steps = 0;
  this.crashed = false;
  //minimum distance to target

  this.applyForce = function(force) {
    this.acc.add(force);
  }

  this.calcFitness = function() {

    var d = dist(this.pos.x, this.pos.y, target.x, target.y);
    var f = 0
    // use exponentials @todo
    if(this.completed) {
      f = map(this.steps, lifespan, 1, 1, 100);
    } else if (this.crashed) {
      f = (1/d) * 0.2;
    } else {
      f = 1/d;
    }
    this.fitness = f;
  }

  this.update = function() {
    //check if reached target
    var d = dist(this.pos.x, this.pos.y, target.x, target.y);

    if(d<10) {
      this.completed = true;
      this.pos = target.copy(); // move to target
    }

    // let rockets crash on edges
    if(this.pos.x < 0 || this.pos.x > width || this.pos.y <0 || this.pos.y > height) {
      this.crashed = true;
    }

    for (i = 0; i < obstacles.length; i ++) {
      this.collide(obstacles[i]);
    }

    //check if hit obstacle

    this.applyForce(this.dna.genes[count]); //apply force from genes vector for each period
    if(!this.completed && !this.crashed) {
      //update physics
      this.vel.add(this.acc);
      this.pos.add(this.vel);
      this.acc.mult(0);
      this.vel.limit(4);
      this.steps++;
    }
  }

  this.show = function() {
    var d = dist(this.pos.x, this.pos.y, target.x, target.y);
    push();
    noStroke();
    fill(map(d, 0, 500,255,0), 200);
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());
    rectMode(CENTER);
    rect(0,0, 25, 5);
    pop();
  }

  this.collide = function(obj) {
    hit = collidePointCircle(this.pos.x,this.pos.y,obj.pos.x,obj.pos.y,obj.r*2);
    if(hit) this.crashed = true;
  }

}

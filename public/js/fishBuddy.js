//----------global defaults
//
const constants = {
    backgroundColor : "rgba(255, 255, 255, 1)",
    deceleration : 0.3,
    acceleration : 0.1,
    slowDownRadius : 30,
    minSpeedCutoff : 0.1,
    maxFishSpeed : 5,
    turnRate : 0.2,
    bubbleAcceleration : 0.1,
    bubbleDrag : 0.98,
    bubbleProb : 0.005,
    endBubbleStreamProb : 0.1,
    minBubbleRadius : 1,
    maxBubbleRadius : 10,
    bubbleQueueReleaseProb : 0.1,
    fishFoodAcceleration : -0.05,
    fishFoodDrag : 0.95
};

var bubbles = [];
var fishFoods = [];
var wanderEnabled = true;
var fish;
var neutral1;

//=========================
//Setup & draw functions
//=========================
function setup() {
    makeCanvas();
    makeFish();
}

function makeCanvas(){
    var canvas = createCanvas(($(window).width()), $(window).height() + 50);
    canvas.parent('canvas-background');
};

function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
}

function draw() {
    //move all birds
    clear();
    background(constants.backgroundColor);
    noStroke();
    updateFish();
    updateBubbles();
    updateFishFoods();
};

function makeFish() {
    fish = new Fish(windowWidth / 2, windowHeight/2);
};

function updateFish() {
    if (fish) {
        fish.update();
    };
};

function updateBubbles() {
    for (var i = 0; i < bubbles.length; i++) {
        bubbles[i].update();
        if (!bubbles[i].alive) {
            bubbles.splice(i, 1);
        };
    };
};

function updateFishFoods() {
    for (var i = 0; i < fishFoods.length; i++) {
        if (fishFoods[i]) {
            fishFoods[i].update();
            if (!fishFoods[i].alive) {
                fishFoods[i] = null;
            };
        };
    };
};

//=========================
//Classes
//=========================


var Fish = function(x, y){
    //a flying target that changes destination randomly
    var that = this;
    this.x = x;
    this.y = y;
    this.width = 0;
    this.height = 0;
    this.target = null;

    this.wander = {
        x : 0,
        y : 0
    };

    this.bubbleQueue = {
        bubbles : [],
        releaseBubble : function() {
            if (this.bubbles.length) {
                this.bubbles.shift();
                bubbles.push(new Bubble(that.x + that.width / 2, that.y, that.vector));
            };
        }
    };

    this.vector = new Vector(0, -1, 0);

    this.image = {
        last : {
            direction : null,
            index : null
        },
        current : {
            direction : null,
            index : null
        }
    };

    this.images = {
        neutral : [],
        right : [],
        left : []
    };

    this.loadImages = function() {
        for (var i = 1; i <= 8; i++) {
            let filename = "../assets/neutral/neutral" + i + ".png";
            console.log(filename);
            this.images.neutral.push(loadImage(filename));
            console.log("Loaded!")
            console.log(this.images.neutral[this.images.neutral.length - 1]);
        };
    };

    this.selectImage = function() {
        this.image.last = this.image.current;

        if (this.magnitude == 0) {
            this.image.current.direction = "neutral";
        } else if (this.vector.x < 0) {
            this.image.current.direction = "neutral";
        } else {
            this.image.current.direction = "neutral";
        };

        if (this.image.last.index == null || this.image.current.direction != this.image.last.direction) {
            this.image.current.index = 0;
        } else {
            if (this.image.current.direction == this.image.last.direction) {
                this.image.current.index = this.image.last.index + 1;
                if (this.image.current.index >= this.images[this.image.current.direction].length) {
                    this.image.current.index = 0;
                };
            };
        };

        this.width = this.images[this.image.current.direction][this.image.current.index].width;
        this.height = this.images[this.image.current.direction][this.image.current.index].height;
    };

    this.accelerate = function() {
        this.vector.magnitude += constants.acceleration;
        if (this.vector.magnitude > constants.maxFishSpeed) {
            this.vector.magnitude = constants.maxFishSpeed;
        };
    };

    this.decelerate = function() {
        this.vector.magnitude -= constants.deceleration;
        if (this.vector.magnitude < constants.minSpeedCutoff) {
            this.vector.magnitude = 0;
        };
    }

    this.executeWander = function() {
        if (wanderEnabled) {
            //rabbit wander is less impulsive and sudden than bird wander
            this.wander.x += random(-0.01, 0.01);
            this.wander.y += random(-0.01, 0.01);
            if (abs(this.wander.x) > 0.09) {
                this.wander.x *= 0.08
            };
            if (abs(this.wander.y) > 0.09) {
                this.wander.y *= 0.08
            };
        };
    };

    this.turnTowards = function(target) {
        //turning is based on adding vectors and scaling back to unit vector
        //destination vector is weighted down for gradual turns
        var sumVector;
        if (target.x != null && target.y != null) {
            let distanceToTarget = findDistance(this.x + this.width / 2, this.y + this.height / 2, target.x + target.width, target.y + target.height);
            if (distanceToTarget <= constants.slowDownRadius) {
                this.decelerate();
            } else {
                this.accelerate();
            };

            if (distanceToTarget < 20) {
                this.target.alive = false;
            };

            this.executeWander();

            var unitVectorToTarget = findUnitVector(this.x + this.width / 2, this.y + this.height / 2, target.x + target.width, target.y + target.height);
            sumUnitVector = findUnitVector(
                0,
                0,
                this.vector.x + unitVectorToTarget.x * constants.turnRate + this.wander.x,
                this.vector.y + unitVectorToTarget.y * constants.turnRate + this.wander.y
            );

            this.vector.x = sumUnitVector.x;
            this.vector.y = sumUnitVector.y;

        } else {
            this.decelerate();
        };
    };

    this.update = function(){
        let distanceToTarget = Infinity;
        let proposedTarget = null;
        for (var i = 0; i < fishFoods.length; i++) {
            if (fishFoods[i] != null) {
                let newDistance = findDistance(this.x + this.width / 2, this.y + this.height / 2, fishFoods[i].x + fishFoods[i].width, fishFoods[i].y + fishFoods[i].height);
                if (newDistance < distanceToTarget) {
                    distanceToTarget = newDistance;
                    proposedTarget = fishFoods[i];
                };
            };
        };

        if (proposedTarget) {
            this.target = proposedTarget;
        } else {
            this.target = {x : null, y: null};
        };

        this.turnTowards(this.target);

        if (random(0, 1) < constants.bubbleProb) {
            while (true) {
                this.bubbleQueue.bubbles.push("bubble");
                if (random(0, 1) < constants.endBubbleStreamProb) {
                    break;
                };
            };
        };

        if (this.bubbleQueue.bubbles.length) {
            if (random(0, 1) < constants.bubbleQueueReleaseProb) {
                this.bubbleQueue.releaseBubble();
            };
        };

        this.x += this.vector.x * this.vector.magnitude;
        this.y += this.vector.y * this.vector.magnitude;

        stroke(10);

        if (frameCount % 2 == 0) {
            this.selectImage();
        };

        if (this.image.current.direction && this.images[this.image.current.direction][this.image.current.index]) {
            image(this.images[this.image.current.direction][this.image.current.index], this.x, this.y);
        } else {
            ellipse(this.x, this.y, 20, 20);
        }
    };
    this.loadImages();
};

var FishFood = function(x, y) {
    var that = this;
    this.x = x;
    this.y = y;
    this.image = null;
    this.width = 10
    this.height = 10;
    this.vector = new Vector(0, -1, 0);
    this.alive = true;

    this.sink = function() {
        var sumVector;

        let floorBuffer = 15;
        if (this.y > (windowHeight - floorBuffer - this.height)) {
            this.vector.magnitude *= 0.5;
            if (this.vector.magnitude <= 0.05) {
                this.vector.magnitude = 0;
            };
        } else {
            var unitVectorToBottom = findUnitVector(this.x, this.y, this.x, windowHeight);
            sumUnitVector = findUnitVector(
                0,
                0,
                this.vector.x + unitVectorToBottom.x * constants.turnRate,
                this.vector.y + unitVectorToBottom.y * constants.turnRate
            );

            this.vector.x = sumUnitVector.x;
            this.vector.y = sumUnitVector.y;



            this.vector.magnitude += constants.fishFoodAcceleration;
            this.vector.magnitude *= constants.fishFoodDrag;
        };
    };

    this.update = function(){
        this.sink();
        this.x += this.vector.x * this.vector.magnitude;
        this.y += this.vector.y * this.vector.magnitude;

        if (this.image) {
            image(this.image, this.x, this.y);
        } else {
            stroke(10);
            fill(10);
            ellipse(this.x, this.y, this.width, this.height);
        };
    };

    this.loadImage = function() {
        this.image = loadImage("../assets/fishFood.png");
        this.width = this.image.width;
        this.height = this.image.height;
    };

    // this.loadImage();
};

var Bubble = function(x, y, vector) {
    var that = this;
    this.x = x;
    this.y = y;
    this.radius = random(constants.minBubbleRadius, constants.maxBubbleRadius);
    this.vector = new Vector(vector.x, vector.y, vector.magnitude);
    this.alive = true;

    this.float = function() {
        //turning is based on adding vectors and scaling back to unit vector
        //destination vector is weighted down for gradual turns
        var sumVector;

        var unitVectorToSurface = findUnitVector(this.x, this.y, this.x, -100);
        sumUnitVector = findUnitVector(
            0,
            0,
            this.vector.x + unitVectorToSurface.x * constants.turnRate,
            this.vector.y + unitVectorToSurface.y * constants.turnRate
        );

        this.vector.x = sumUnitVector.x;
        this.vector.y = sumUnitVector.y;

        this.vector.magnitude += constants.bubbleAcceleration;
        this.vector.magnitude *= constants.bubbleDrag;
    };

    this.update = function(){
        this.float();
        this.x += this.vector.x * this.vector.magnitude;
        this.y += this.vector.y * this.vector.magnitude;

        if (this.y < -50) {
            this.alive = false;
        };

        stroke(10);
        fill(10);
        ellipse(this.x, this.y, this.radius, this.radius);
    };
};


var Vector = function(x, y, magnitude) {
    this.x = x;
    this.y = y;
    this.magnitude = magnitude;
};

//=========================
//Interactivity functions
//=========================
function touchStarted() {
    if (fish) {
        let created = false;
        for (var i = 0; i < fishFoods.length; i++) {
            if (fishFoods[i] == null) {
                fishFoods[i] = new FishFood(mouseX, mouseY);
                created = true;
                break;
            };
        }
        if (!created) {
            fishFoods.push(new FishFood(mouseX, mouseY));
        };
    };
};

//=========================
//Angle functions
//=========================
function findUnitVector(x1, y1, x2, y2) {
    //calculates normal vector between two points (in order), converts to unit vector
    var normalVector = new Vector(x2 - x1, y2 - y1, null);
    var magnitude = sqrt((Math.pow(normalVector.x, 2)) + (Math.pow(normalVector.y, 2)));
    if (magnitude == 0) {
        var unitVector = new Vector(0, 0, 0);
    } else {
        var unitVector = new Vector(normalVector.x / magnitude, normalVector.y / magnitude, 1);
    };

    return unitVector;
};

function convertUnitToNormalVector(unitVector, magnitude) {
    normalVector = new Vector();
    normalVector.x = unitVector.x * magnitude;
    normalVector.y = unitVector.y * magnitude;
    normalVector.magnitude = magnitude;
    return normalVector;
};

function findDistance(x1, y1, x2, y2) {
    distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    return distance;
};

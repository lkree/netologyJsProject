'use strict'

class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  exception() {
    throw new Error('Можно прибавлять к вектору только вектор типа Vector')
  }

  plus(vector) {
    if (vector instanceof Vector) {
      let newVector = new Vector(vector.x, vector.y);
      newVector.x += this.x;
      newVector.y += this.y;
      return newVector;
    }
    this.exception();
  }

  times(factor) {
    let newVector = new Vector(this.x, this.y);
    newVector.x *= factor;
    newVector.y *= factor;
    return newVector;
  }
}

class Actor {
  constructor(location = new Vector(), size = new Vector(1,1), speed = new Vector()) {
    if (
      !(location instanceof Vector) ||
      !(size instanceof Vector) ||
      !(speed instanceof Vector)
    ) {
      throw new Error('В конструктор Actor передан не Vector')
    }

    this.pos = location;
    this.size = size;
    this.speed = speed;
  }

  act() {

  }

  get left() {
    return this.pos.x;
  }
  get right() {
    return this.pos.x + this.size.x;
  }
  get top() {
    return this.pos.y;
  }
  get bottom() {
    return this.pos.y + this.size.y;
  }

  get type() {
    return 'actor';
  }

  isIntersect(destinationObject) {
    if (!(destinationObject instanceof Actor)) {
      throw new Error('В isIntersect передан не Actor');
    }
    if (
      destinationObject === this ||
      destinationObject.size.x < 0 ||
      destinationObject.size.y < 0
    ) {
      return false;
    }
    if (
      this.right > destinationObject.left && 
      this.left < destinationObject.right && 
      this.top < destinationObject.bottom && 
      this.bottom > destinationObject.top
    ) {
      return true;
    }
    return false;
  }
}

class Level {
  constructor(grid = [], actors = []) {
    this.grid = grid.slice();
    this.actors = actors.slice();
    this.status = null;
    this.finishDelay = 1;
    this.player = this.actors.find(el => el.type === 'player');
    this.height = this.grid.length;
    this.width = this.grid.reduce((acumulator, currentValue) => {
      return acumulator > currentValue.length ? acumulator : currentValue.length;
    }, 0);
  }

  isFinished() {
    return this.status !== null && this.finishDelay < 0;
  }

  actorAt(destinationActor) {
    if (destinationActor instanceof Actor) {
      return this.actors.find(el => destinationActor.isIntersect(el));
    }
    throw new Error('В actorAt передан не Vector');
  }

  obstacleAt(destinationLocation, objectSize) {
    if (
      !(destinationLocation instanceof Vector) ||
      !(objectSize instanceof Vector)) {
        throw new Error('В obstacleAt передан не Vector');
      }

      let newXpos = Math.round(destinationLocation.x),
          newYpos = Math.round(destinationLocation.y),
          newXsize = Math.round(objectSize.x),
          newYsize = Math.round(objectSize.y),
          destinationObject = new Actor(new Vector(newXpos, newYpos), new Vector(newXsize, newYsize));

    if (
      destinationObject.left < 0 || 
      destinationObject.right > this.width || 
      destinationObject.top < 0
    ) {
      return 'wall';
    } 
    if (destinationObject.bottom > this.height) {
      return 'lava';
    }

    for (let y = destinationObject.top; y < destinationObject.bottom; y++) {
      for (let x = destinationObject.left; x < destinationObject.right; x++) {
        const gridLevel = this.grid[y][x];
        if (gridLevel) {
          return gridLevel;
        } else {
          return undefined;
        }
      }
    }
  }

  removeActor(actorToRemove) {
    this.actors.find((el, index) => {
      if (
        el.right === actorToRemove.right &&
        el.left === actorToRemove.left &&
        el.top === actorToRemove.top &&
        el.bottom === actorToRemove.bottom
      ) {
        return this.actors.splice(index, 1);
      }
    })
  }

  noMoreActors(objectType) {
    return this.actors.find((el) => el.type === objectType) ? false : true;
  }

  playerTouched(obstacle, injureObject = new Actor()) {
    if (this.status !== null) {
      return undefined
    }
    if (
      obstacle === 'lava' ||
      obstacle === 'fireball'
    ) {
      this.status = 'lost';
    }
    if (
      obstacle === 'coin' &&
      injureObject.type === 'coin'
    ) {
      this.removeActor(injureObject);
      this.noMoreActors(obstacle) ? this.status = 'won': undefined;
    }
  }
}
class LevelParser {
  constructor(dictionary = {}) {
    this.dictionary = Object.assign({}, dictionary);
  }

  actorFromSymbol(dictionarySymbol) {
    return this.dictionary[dictionarySymbol];
  }

  obstacleFromSymbol(obstacleSymbol) {
    if (obstacleSymbol === 'x') {
      return 'wall';
    }
    if (obstacleSymbol === '!') {
      return 'lava';
    }
  }

  createGrid(arrayStrings) {
    return arrayStrings.map(el => el.split('')).map(el => el.map(el => this.obstacleFromSymbol(el)));
  }
  createActors(arrayStrings) {
    return arrayStrings.reduce((final, el, index) => {
      el.split('').map((elm, ind) => {
      let newEl = this.actorFromSymbol(elm);
        if (typeof newEl === 'function') {
          newEl = new newEl(new Vector(ind, index));
          if (newEl instanceof Actor) {
            final.push(newEl);
          }
        }
    })
    return final;
  }, []);
  }

  parse(mapPlan) {
    return new Level(this.createGrid(mapPlan), this.createActors(mapPlan));
  }
}

class Fireball extends Actor {
  constructor(coordinates = new Vector(), speed = new Vector()) {
    super(coordinates, new Vector(1,1), speed)
  }
  get type() {
    return 'fireball';
  }

  getNextPosition(time = 1) {
    return new Vector(this.pos.x + this.speed.x * time, this.pos.y + this.speed.y * time);
  }

  handleObstacle() {
    this.speed.x *= -1;
    this.speed.y *= -1;
  }

  act(time, level) {
    let newPosition = this.getNextPosition(time);
    if (!(level.obstacleAt(newPosition, this.size))) {
      this.pos = newPosition;
    } else {
      this.handleObstacle();
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(position = new Vector()) {
    super(position, new Vector(2, 0));
  }
}

class VerticalFireball extends Fireball {
  constructor(position = new Vector()) {
    super(position, new Vector(0, 2));
  }
}

class FireRain extends Fireball {
  constructor(position = new Vector()) {
    super(position, new Vector(0, 3));
    this.beginPos = this.pos;
  }

  handleObstacle() {
    this.pos = this.beginPos;
  }
}

class Coin extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * (Math.PI * 2);
    this.startPos = this.pos;
  }

  get type() {
    return 'coin';
  }

  updateSpring(time = 1) {
    this.spring += this.springSpeed * time;
  }

  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }

  getNextPosition(time = 1) {
    this.updateSpring(time);
    return this.startPos.plus(this.getSpringVector());
  }

  act(time) {
    this.pos = this.getNextPosition(time);
  }
}

class Player extends Actor {
  constructor(coordinates = new Vector(0, 0)) {
    super(coordinates.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5), new Vector(0, 0));
  }

  get type() {
    return 'player';
  }
}

const actorDict = {
  '@': Player,
  'v': FireRain,
  'o': Coin,
  '=': HorizontalFireball,
  '|': VerticalFireball

};
const parser = new LevelParser(actorDict);

loadLevels()
  .then((res) => {
    runGame(JSON.parse(res), parser, DOMDisplay)
      .then(() => alert('Вы выиграли!'))
  });
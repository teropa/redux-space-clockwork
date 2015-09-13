/**
 * Adapted from the "Space Clockwork" example in Matt Pearson's
 * "Generative Art" book (https://www.manning.com/books/generative-art).
 */

import {Record, List, Map, Range} from 'immutable';
import makeRandom from 'random-js';
import radians from 'degrees-radians';
import {createStore} from 'redux';

// --- clockwork engine ---

const Branch = Record({
  level: 0,
  x: 0,
  y: 0,
  endX: 0,
  endY: 0,
  length: 0,
  rotation: 0,
  rotationChange: 0,
  children: List()
});

const random = makeRandom();
const numLevels = 8;
const childRange = Range(0, 2);

function addChildren(branch, speed) {
  if (branch.level >= numLevels) {
    return branch;
  } else {
    const nextLevel = branch.level + 1;
    const children = childRange.map(() => makeBranch(nextLevel, branch.endX, branch.endY, speed));
    return branch.set('children', children.toList());
  }
}

function nextBranchRotation(branch, speed) {
  const next = branch.rotation + branch.rotationChange * speed;
  if (next > 360)    return 0;
  else if (next < 0) return 360;
  else               return next;
}

function updateBranch(branch, x, y, speed) {
  const length = branch.length;
  const rotation = nextBranchRotation(branch, speed);
  const radian = radians(rotation);
  const endX = x + (length * Math.cos(radian));
  const endY = y + (length * Math.sin(radian));
  return branch.merge({
    x,
    y,
    rotation,
    endX,
    endY,
    children: branch.children.map(c => updateBranch(c, endX, endY, speed))
  });
}

function makeBranch(level, x, y, speed) {
  const branch = new Branch({
    level,
    length: level === 1 ? 0 : (1 / level) * random.integer(100, 1500),
    rotation: random.die(360),
    rotationChange: random.die(4) * random.pick([1, -1]),
  });
  return addChildren(updateBranch(branch, x, y, speed), speed);
}


// --- action types ---

const INIT = 'INIT';
const NEXT_FRAME = 'NEXT_FRAME';
const MOVE = 'MOVE';

// --- reducer ---

function reducer(state = Map(), action) {
  switch (action.type) {
  case INIT:
    const aspectRatio = (window.innerWidth / window.innerHeight);
    const width = 2000;
    const height = 2000 / aspectRatio;
    const newSpeed = action.speed || state.get('speed');
    return state.merge({
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      width: width,
      height: height,
      tree: makeBranch(1, width/2, height/2, 1),
      speed: newSpeed
    });
  case NEXT_FRAME:
    const rootX = state.get('width') / 2;
    const rootY = state.get('height') / 2;
    const speed = state.get('speed');
    return state.update('tree', t => updateBranch(t, rootX, rootY, speed));
  case MOVE:
    const xDist = action.x - (state.get('windowWidth') / 2);
    const yDist = action.y - (state.get('windowHeight') / 2);
    const dist = Math.sqrt(xDist * xDist + yDist * yDist);
    const factor = state.get('windowWidth') / 3 * (xDist < 0 ? -1 : 1);
    return state.set('speed', dist / factor);
  }
  return state;
}


// --- redux init ---

const store = createStore(reducer);
store.dispatch({type: INIT, speed: 1});


// --- render loop ---

window.requestAnimationFrame(function nextFrame() {
  store.dispatch({type: NEXT_FRAME});
  window.requestAnimationFrame(nextFrame);
})
store.subscribe(() => render(store.getState()));


// --- visualization ---

const canvas = document.getElementById('app');
const ctx = canvas.getContext('2d');
function render(state) {
  canvas.width = state.get('width');
  canvas.height = state.get('height');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  renderLevel(1, List.of(state.get('tree')));
}
function renderLevel(level, branches) {
  const alpha = 1 / (level + 1);
  ctx.strokeStyle = `rgba(255,255,255,${alpha / 2})`;
  ctx.fillStyle = `rgba(248,187,208,${alpha})`;
  ctx.lineWidth = (1 / level) * 50;
  ctx.lineCap = 'round';

  // "hands"
  ctx.beginPath();
  branches.forEach(b => {
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.endX, b.endY);
  });
  ctx.stroke();

  // "gears"
  ctx.beginPath();
  branches.forEach(b => {
    const x = b.x;
    const y = b.y;
    const length = b.length;
    ctx.moveTo(x, y);
    ctx.arc(x, y, length/40, 0, Math.PI*2, false);
  });
  ctx.fill();

  // "children"
  const children = branches.flatMap(b => b.children);
  if (children.size) {
    renderLevel(level + 1, children);
  }
}
canvas.addEventListener('mousemove', e => {
  store.dispatch({type: MOVE, x: e.clientX, y: e.clientY})
});
canvas.addEventListener('click', e => {
  store.dispatch({type: INIT})
});

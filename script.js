document.addEventListener("DOMContentLoaded", () => {
  gsap.registerPlugin(ScrollTrigger);

  const lenis = new Lenis();
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);
  
  

  const stickySection = document.querySelector(".sticky");
  const video = document.querySelector(".sticky-video")
  const stickyHeight = window.innerHeight * 7;
  const outlineCanvas = document.querySelector(".outline-layer");
  const fillCanvas = document.querySelector(".fill-layer");
  const outlineCtx = outlineCanvas.getContext("2d");
  const fillCtx = fillCanvas.getContext("2d");
  const cards         = document.querySelector(".cards");
  const cardsWidth    = cards.scrollWidth;
  const viewportWidth = window.innerWidth;
  

  function setCanvasSize(canvas, ctx) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.scale(dpr, dpr);
  }
  setCanvasSize(outlineCanvas, outlineCtx);
  setCanvasSize(fillCanvas, fillCtx);
  // right after setCanvasSize(fillCanvas, fillCtx);
// gradient from top (red) to bottom (black)
const height = fillCanvas.getBoundingClientRect().height;
const fillGrad = fillCtx.createLinearGradient(0, 0, 0, height);
fillGrad.addColorStop(0, "#000000");
fillGrad.addColorStop(1, "#ff0000");
fillCtx.fillStyle = fillGrad;
// keep strokeStyle if you like:
// fillCtx.strokeStyle = "#000";


  const triangleSize = 150;
  const lineWidth = 1.4;
  const SCALE_THRESHOLD = 0.01;
  const triangleStates = new Map();
  let animationFrameId = null;
  let canvasXPosition = 0;

  

  function drawTriangle(ctx, x, y, fillScale = 0, flipped = false) {
    const halfSize = triangleSize / 2;

    if (fillScale < SCALE_THRESHOLD) {
      ctx.beginPath();
      if (!flipped) {
        ctx.moveTo(x, y - halfSize);
        ctx.lineTo(x + halfSize, y + halfSize);
        ctx.lineTo(x - halfSize, y + halfSize);
      } else {
        ctx.moveTo(x, y + halfSize);
        ctx.lineTo(x + halfSize, y - halfSize);
        ctx.lineTo(x - halfSize, y - halfSize);
      }
      ctx.closePath();
      ctx.strokeStyle = "rgba(4, 4, 4, 0.07)";
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }

    if (fillScale >= SCALE_THRESHOLD) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(fillScale, fillScale);
      ctx.translate(-x, -y);

      ctx.beginPath();
      if (!flipped) {
        ctx.moveTo(x, y - halfSize);
        ctx.lineTo(x + halfSize, y + halfSize);
        ctx.lineTo(x - halfSize, y + halfSize);
      } else {
        ctx.moveTo(x, y + halfSize);
        ctx.lineTo(x + halfSize, y - halfSize);
        ctx.lineTo(x - halfSize, y - halfSize);
      }
      ctx.closePath();
      // ctx.fillStyle = "#000";
      ctx.strokeStyle = "#6D0100";
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawGrid(scrollProgress = 0) {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    outlineCtx.clearRect(0, 0, outlineCanvas.width, outlineCanvas.height);
    fillCtx.clearRect(0, 0, fillCanvas.width, fillCanvas.height);

    const animationProgress =
      scrollProgress <= 0.65 ? 0 : (scrollProgress - 0.65) / 0.35;

    let needsUpdate = false;
    const animationSpeed = 0.15;

    triangleStates.forEach((state, key) => {
      if (state.scale < 1) {
        const x =
          state.col * (triangleSize * 0.5) + triangleSize / 2 + canvasXPosition;
        const y = state.row * triangleSize + triangleSize / 2;
        const flipped = (state.row + state.col) % 2 !== 0;
        drawTriangle(outlineCtx, x, y, 0, flipped);
      }
    });

    triangleStates.forEach((state, key) => {
      const shouldBeVisible = state.order <= animationProgress;
      const targetScale = shouldBeVisible ? 1 : 0;
      const newScale =
        state.scale + (targetScale - state.scale) * animationSpeed;

      if (Math.abs(newScale - state.scale) > 0.001) {
        state.scale = newScale;
        needsUpdate = true;
      }

      if (state.scale >= SCALE_THRESHOLD) {
        const x =
          state.col * (triangleSize * 0.5) + triangleSize / 2 + canvasXPosition;
        const y = state.row * triangleSize + triangleSize / 2;
        const flipped = (state.row + state.col) % 2 !== 0;
        drawTriangle(fillCtx, x, y, state.scale, flipped);
      }
    });

    if (needsUpdate) {
      animationFrameId = requestAnimationFrame(() => drawGrid(scrollProgress));
    }
  }

  function initializeTriangles() {
    const cols = Math.ceil(window.innerWidth / (triangleSize * 0.5));
    const rows = Math.ceil(window.innerHeight / (triangleSize * 0.5));
    const totalTriangles = rows * cols;

    const positions = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        positions.push({ row: r, col: c, key: `${r}-${c}` });
      }
    }

    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    positions.forEach((pos, index) => {
      triangleStates.set(pos.key, {
        order: index / totalTriangles,
        scale: 0,
        row: pos.row,
        col: pos.col,
      });
    });
  }

  initializeTriangles();
  drawGrid();

  window.addEventListener("resize", () => {
    setCanvasSize(outlineCanvas, outlineCtx);
    setCanvasSize(fillCanvas, fillCtx);
    triangleStates.clear();
    initializeTriangles();
    drawGrid();
  });


  

  ScrollTrigger.create({
    trigger: stickySection,
    start: "top top",
    end: `+=${stickyHeight}px`,
    pin: true,
    scrub: true,
    onUpdate: (self) => {
      canvasXPosition = -self.progress * 200;
      drawGrid(self.progress);

      const cards = document.querySelector(".cards");
      const progress = Math.min(self.progress / 0.654, 1);
      gsap.set(cards, {
        x: -progress * window.innerWidth * 3,
      });
    },
  });

const coolVideo = document.querySelector("video");


const stickyVideo = document.querySelector('.sticky-video');

function initVideoScrub() {
  // compute exactly how many pixels you want to scroll
  // let’s use the .cards width if that’s what you want to line up with
  const scrollEnd = cards.scrollWidth - window.innerWidth;

  ScrollTrigger.create({
    trigger: ".video-sticky",
    start:   "top top",
    end:     "bottom+=150% bottom",  // exactly one "cards"‑width of scroll
    scrub:   3,                 // ZERO smoothing → direct mapping
    pin:     true,
    onUpdate(self) {
      // map scroll progress (0→1) directly to video time (0→duration)
      const t = stickyVideo.duration * self.progress;
      if (stickyVideo.fastSeek) {
        stickyVideo.fastSeek(t);    // instant if browser supports it
      } else {
        stickyVideo.currentTime = t;
      }
    },
    // markers: true
  });
}

// once metadata is loaded, fire it up
if (stickyVideo.readyState >= 1) {
  initVideoScrub();
} else {
  stickyVideo.addEventListener("loadedmetadata", initVideoScrub, { once: true });
}


// let tl = gsap.timeline({
//   scrollTrigger: {
//     trigger: "video",
//     start: "top top",
//     end: "bottom+=200% bottom",
//     scrub: 2,  }
// });

// // wait until video metadata is loaded, so we can grab the proper duration before adding the onscroll animation. Might need to add a loader for loonng videos
// coolVideo.onloadedmetadata = function () {
//   tl.to(coolVideo, { currentTime: coolVideo.duration });
// };

// Dealing with devices
function isTouchDevice() {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}
if (isTouchDevice()) {
  coolVideo.play();
  coolVideo.pause();
}

gsap.registerPlugin(ScrollTrigger);

const outroTl = gsap.timeline({
  scrollTrigger: {
    trigger: "#outro",
    start:    "top bottom",   // when top of #outro hits bottom of viewport
    end:      "bottom top",    // until bottom of #outro hits top of viewport
    scrub:    true,            // play forward on scroll down, reverse on scroll up
    // markers: true,          // uncomment to debug
  }
});

outroTl
  .to("#outro .alpha",        { y:0, opacity:1, duration:0.3, ease:"power2.out" })
  .to(
    "#outro .wohnen, #outro .wohnen-img",
    { y:0, opacity:1, duration:0.3, ease:"power2.out" },
    "+=0.1"
  )
  .to("#outro .gmbh",         { y:0, opacity:1, duration:0.3, ease:"power2.out" }, "+=0.1")
  .to("#outro .address",      { y:0, opacity:1, duration:0.3, ease:"power2.out" }, "+=0.1")
  .to("#outro .owner",        { y:0, opacity:1, duration:0.3, ease:"power2.out" }, "+=0.1")
  .to("#outro a.outro-text",  { y:0, opacity:1, duration:0.3, ease:"power2.out" }, "+=0.1");

});



let pageRevealDelay = 2;
gsap.from(".logo a, .contact a, .hero a", 1.5, {
  top: "25px",
  ease: "power4.inOut",
  stagger: {
    amount: 0.1,
  },
  delay: pageRevealDelay,
});

gsap.from(
  "h1",
  1.5,
  {
    y: 150,
    ease: "power4.inOut",
    stagger: {
      amount: 0.1,
    },
  },
  "<"
);
gsap.from(
  "img",
  1.5,
  {
    y: 150,
    ease: "power4.inOut",
    stagger: {
      amount: 0.1,
    },
  },
  "<"
);
gsap.from(
  "p",
  1.75,
  {
    y: 30,
    ease: "power3.inOut",
    stagger: {
      amount: 0.25,
    },
  },
  "<"
);


gsap.from(".loader-wrapper", 2, {
  scale: 0.8,
  ease: "power1.inOut",
});

gsap.from(".loader", 2, {
  top: "100%",
  ease: "power3.inOut",
});

gsap.to(
  ".loader-wrapper, .pre-loader",
  1,
  {
    top: "-120%",
    ease: "power3.inOut",
    delay: 2,
  },
  "-=1"
);
// Smooth Scroll when clicked on the link
const lenis = new Lenis({
  duration: 2, // or even 2 for slower scroll
  easing: (t) => 1 - Math.pow(1 - t, 4) // easeOutQuart
});

lenis.on("scroll", ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

document.querySelector(".scroll-to-sticky").addEventListener("click", (e) => {
  e.preventDefault();
  lenis.scrollTo("#sticky");
});

document.querySelector(".scroll-to-outro").addEventListener("click", (e) => {
  e.preventDefault();
  lenis.scrollTo("#outro");
});

// link button animation
// assume GSAP is already loaded
document.querySelectorAll('.animated-link').forEach(link => {
  const text = link.querySelector('.inner-text');

  // build a paused timeline for this link
  const tl = gsap.timeline({ paused: true })
    // step 1: scroll up out of view
    .to(text, { yPercent: -100, duration: 0.3, ease: 'power1.in' })
    // step 2: jump to below
    .set(text,    { yPercent: 100 })
    // step 3: scroll back into place
    .to(text, { yPercent: 0, duration: 0.3, ease: 'power1.out' });

  // restart on hover
  link.addEventListener('mouseenter', () => tl.restart());
  // optionally reverse on leave
  link.addEventListener('mouseleave', () => tl.reverse());
});


//   link.addEventListener("mouseenter", () => tl.restart());

// document.addEventListener("mousemove", function (e) {
//   let normX = e.clientX / window.innerWidth - 0.5; // range -0.5 to 0.5
//   let normY = e.clientY / window.innerHeight - 0.5;

//   let moveX = normX; // Horizontal translation (adjust multiplier to taste)
//   let moveY = normY; // Vertical translation
//   let distance = Math.hypot(normX, normY); // sqrt(normX² + normY²)
//   let zoom = 1 + distance * 0.2; // adjust multiplier as needed

//   gsap.to(".bubbles", {
//     x: moveX,
//     y: moveY,
//     scale: zoom,
//     ease: "power2out",
//     duration: 1.3,
//   });
// });

// // Instagram profile URL
// const instagramUrl = "https://www.instagram.com/alphawohnen/";

// // Function to generate the QR code
// function generateQRCode() {
//   const qr = new QRious({
//     element: document.getElementById("qr-code"),
//     size: 200,
//     value: instagramUrl
//   });

//   // Display the generated QR code
//   document.getElementById("qr-code").style.display = "block";
// }

// // Generate the QR code on page load
// window.onload = generateQRCode;





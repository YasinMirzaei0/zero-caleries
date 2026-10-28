/* ==========================================================
   Config: asset locations
   ----------------------------------------------------------
   مدل‌های سه‌بعدی و تصاویر از این آدرس بارگذاری می‌شوند.
   اگر فایل‌ها را داخل پوشه‌ی assets
   گذاشتی، مقدار LOCAL_ASSETS را true کن تا از خود پروژه
   (و نه از سرور خارجی) خوانده شوند.
   ========================================================== */
const LOCAL_ASSETS = false;
const REMOTE_BASE  = 'https://api.getlayers.ai/storage/v1/object/public/public/assets/soda-14ff8a788d/';
const LOCAL_BASE   = 'assets/';
const BASE = LOCAL_ASSETS ? LOCAL_BASE : REMOTE_BASE;

/* Hero: 3D product, flavors, theme switching */
const isMobile = window.innerWidth < 900;
// موبایل: مدل‌های سنگین کمتر
if (isMobile) document.querySelectorAll('.b4,.b5,.b6,.b7,.b8,.b9,.leaf').forEach(e => e.remove());
const leafEls = [...document.querySelectorAll('.leaf')];

const modelViewer = document.querySelector('#product-model');
const berriesFG = document.querySelector('.berries-container');
const berriesBG = document.querySelector('.berries-container-bg');
const leavesBG = document.querySelector('.leaves-container');
const allBerries = document.querySelectorAll('.berry');
const cards = document.querySelectorAll('.card');
const dish = document.getElementById('dish');
let isSwitching = false, switchSpin = 0, blueTexture = null, greenTexture = null;
let current = 'classic';
const ORDER = ['classic', 'blue', 'pasta', 'burger'];
const THEMES = {
    classic: { inner: '#0b8a78', mid: '#044e3b', outer: '#011411' },
    blue:    { inner: '#0b4f8a', mid: '#04294e', outer: '#010c14' },
    pasta:   { inner: '#c2410c', mid: '#7f1d1d', outer: '#1f0808' },
    burger:  { inner: '#9a5b13', mid: '#4a2c0d', outer: '#140b04' }
};
const isDish = f => f === 'pasta' || f === 'burger';
gsap.set(dish, { opacity: 0 });
cards.forEach(c => { c.setAttribute('role', 'button'); c.tabIndex = 0; c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.click(); } }); });

modelViewer.addEventListener('load', async () => {
    try {
        blueTexture = await modelViewer.createTexture(BASE + 'blue%20base%20color.jpg');
        greenTexture = await modelViewer.createTexture(BASE + 'green%20base%20color.jpg');
        if (modelViewer.model) {
            const m = modelViewer.model.materials[0];
            if (m && m.pbrMetallicRoughness.baseColorTexture) {
                m.pbrMetallicRoughness.baseColorTexture.setTexture(blueTexture);
                await new Promise(r => requestAnimationFrame(r));
                m.pbrMetallicRoughness.baseColorTexture.setTexture(greenTexture);
            }
        }
    } catch (e) { console.error('Texture preload failed', e); }
});

function setCanTexture(f) {
    const tex = f === 'blue' ? blueTexture : greenTexture;
    if (modelViewer.model && tex) modelViewer.model.materials.forEach(m => { if (m.pbrMetallicRoughness.baseColorTexture) m.pbrMetallicRoughness.baseColorTexture.setTexture(tex); });
}

cards.forEach(card => card.addEventListener('click', () => { switchFlavor(card.dataset.flavor); startTimer(); }));
document.getElementById('next').addEventListener('click', () => { switchFlavor(ORDER[(ORDER.indexOf(current) + 1) % 4]); startTimer(); });
document.getElementById('prev').addEventListener('click', () => { switchFlavor(ORDER[(ORDER.indexOf(current) + 3) % 4]); startTimer(); });

async function switchFlavor(flavor) {
    if (isSwitching || flavor === current) return;
    isSwitching = true;
    const prev = current; current = flavor;
    const heroCenter = document.querySelector('.hero-center');
    cards.forEach(c => c.classList.toggle('active', c.dataset.flavor === flavor));

    const t = THEMES[flavor];
    gsap.to(document.body, { '--bg-inner': t.inner, '--bg-mid': t.mid, '--bg-outer': t.outer, duration: 1.5, ease: 'power2.inOut' });

    // ---- Berries: implode -> swap model -> explode ----
    let done = 0;
    const berries = document.querySelectorAll('.berry');
    berries.forEach(berry => {
        const cx = heroCenter.offsetLeft + heroCenter.offsetWidth / 2 - berry.offsetLeft - berry.offsetWidth / 2;
        const cy = heroCenter.offsetTop + heroCenter.offsetHeight / 2 - berry.offsetTop - berry.offsetHeight / 2;
        const a = parseFloat(berry.dataset.angle) || 0;
        const spread = isMobile ? 70 : 200, nx = (Math.random() - 0.5) * spread, ny = (Math.random() - 0.5) * spread;
        gsap.set(berry, { rotation: a, x: parseFloat(berry.dataset.baseX) || 0, y: parseFloat(berry.dataset.baseY) || 0 });
        gsap.timeline()
            .to(berry, { x: cx, y: cy, rotation: a + 45, scale: 0.1, opacity: 0, duration: 0.5, ease: 'power2.in',
                onComplete: () => { berry.src = BASE + (flavor === 'blue' ? 'blueberry.glb' : 'cherry.glb'); heroCenter.style.zIndex = 50; } })
            .to(berry, { duration: 0.3 })
            .to(berry, { onStart: () => { heroCenter.style.zIndex = 1; }, x: nx, y: ny, rotation: a + 90, scale: 1, opacity: 1, duration: 0.9, ease: 'back.out(1.5)',
                onComplete: () => {
                    berry.dataset.angle = a + 90; berry.dataset.baseX = nx; berry.dataset.baseY = ny; berry.dataset.rx = 0; berry.dataset.ry = 0;
                    if (++done === berries.length) isSwitching = false;
                } });
    });

    if (!berries.length) isSwitching = false;   // اگر مدل‌ها بارگذاری نشده باشند، قفل نشود

    // ---- Hero product: out ----
    const spin = { val: 0, blur: 0 };
    const applyCan = () => { switchSpin = spin.val; modelViewer.style.filter = `blur(${spin.blur}px)`; };
    if (isDish(prev)) await gsap.to(dish, { rotation: -240, scale: 0.2, opacity: 0, duration: 0.6, ease: 'power2.in' });
    else await gsap.to(spin, { val: 360, blur: 15, duration: 0.6, ease: 'power2.in', onUpdate: applyCan });

    // ---- swap at peak ----
    if (isDish(flavor)) {
        modelViewer.style.opacity = 0;
        spin.val = 0; spin.blur = 0; applyCan(); modelViewer.style.filter = 'none';
        dish.dataset.item = flavor;
        gsap.set(dish, { rotation: -240, scale: 0.2, opacity: 0 });
        gsap.to(dish, { rotation: 0, scale: 1, opacity: 1, duration: 1.3, ease: 'back.out(1.2)' });
    } else {
        setCanTexture(flavor);
        modelViewer.style.opacity = 1;
        if (isDish(prev)) { spin.val = 360; spin.blur = 15; applyCan(); }
        gsap.to(spin, { val: 720, blur: 0, duration: 1.5, ease: 'back.out(0.7)', onUpdate: applyCan,
            onComplete: () => { switchSpin = 0; modelViewer.style.filter = 'none'; } });
    }
}

/* ==========================================================
   Assets: بارگذاری مدل‌ها/تصاویر + رفتار امن در صورت نبودن فایل
   هر عنصر با data-asset="نام-فایل" از BASE (config.js) خوانده می‌شود.
   اگر فایلی بارگذاری نشد، سایت بدون خطا و با جایگزین (ایموجی) کار می‌کند.
   ========================================================== */
document.querySelectorAll('[data-asset]').forEach(el => {
    const url = BASE + encodeURIComponent(el.dataset.asset);

    if (el.tagName === 'MODEL-VIEWER') {
        el.addEventListener('error', () => {
            if (el.id === 'product-model') {
                el.style.display = 'none';
                const fb = document.createElement('div');
                fb.className = 'emo';
                fb.style.cssText = 'font-size:min(40vw,14rem);text-align:center';
                fb.textContent = '🥤';
                el.parentNode.insertBefore(fb, el);
            } else {
                el.remove();
            }
        });
    } else if (el.tagName === 'IMG') {
        el.addEventListener('error', () => {
            const fb = document.createElement('div');
            fb.className = 'emo';
            fb.textContent = el.closest('.card')?.dataset.flavor === 'blue' ? '💙' : '🥤';
            el.replaceWith(fb);
        }, { once: true });
    }
    el.src = url;
});

/* Auto rotation, mouse parallax, berry animation */
// ---- Auto rotation: can1 -> can2 -> pasta -> burger -> ... ----
let timer, heroVisible = true;
function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        if (document.hidden || isSwitching || !heroVisible) return;
        switchFlavor(ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]);
    }, 7000);
}
startTimer();
new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }, { threshold: 0.3 }).observe(document.getElementById('home'));

// ---- Mouse parallax & berry repulsion ----
allBerries.forEach(b => { b.dataset.rx = 0; b.dataset.ry = 0; b.dataset.angle = Math.random() * 360; b.dataset.baseX = 0; b.dataset.baseY = 0; });
let mouse = { x: 0, y: 0, px: -999, py: -999 }, currentMouse = { x: 0, y: 0 };
window.addEventListener('mousemove', e => {
    mouse.x = e.clientX / window.innerWidth - 0.5; mouse.y = e.clientY / window.innerHeight - 0.5;
    mouse.px = e.clientX; mouse.py = e.clientY;
});

function animate() {
    if (document.hidden || !heroVisible) { requestAnimationFrame(animate); return; }
    const time = Date.now() * 0.001;
    currentMouse.x += (mouse.x - currentMouse.x) * 0.05;
    currentMouse.y += (mouse.y - currentMouse.y) * 0.05;
    modelViewer.cameraOrbit = `${currentMouse.x * 40 + switchSpin}deg ${90 + currentMouse.y * 20}deg 380%`;
    berriesFG.style.transform = `translate(${currentMouse.x * 60}px, ${currentMouse.y * 60}px)`;
    berriesBG.style.transform = `translate(${currentMouse.x * -30}px, ${currentMouse.y * -30}px)`;
    if (leavesBG) leavesBG.style.transform = `translate(${currentMouse.x * -15}px, ${currentMouse.y * -15}px)`;

    if (!isSwitching) {
        allBerries.forEach((berry, i) => {
            const r = berry.getBoundingClientRect();
            const dx = mouse.px - (r.left + r.width / 2), dy = mouse.py - (r.top + r.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            let tx = 0, ty = 0, sp = 1;
            if (dist < 400) { const f = (400 - dist) / 400; tx = (dx / dist) * f * -80; ty = (dy / dist) * f * -80; sp = 1 + f * 5; }
            let rx = parseFloat(berry.dataset.rx) || 0, ry = parseFloat(berry.dataset.ry) || 0, angle = parseFloat(berry.dataset.angle) || 0;
            const bx = parseFloat(berry.dataset.baseX) || 0, by = parseFloat(berry.dataset.baseY) || 0;
            rx += (tx - rx) * 0.1; ry += (ty - ry) * 0.1; angle += 0.2 * sp;
            berry.dataset.rx = rx; berry.dataset.ry = ry; berry.dataset.angle = angle;
            const dur = [5, 7, 6, 8, 5.5, 6.5, 9, 11, 10][i % 9];
            const ph = (time + i * 0.7) * (Math.PI * 2 / dur);
            gsap.set(berry, { x: rx + bx, y: ry + by + Math.sin(ph) * 15, rotation: angle + Math.cos(ph) * 6 });
        });
    }
    leafEls.forEach((leaf, i) => {
        const ph = (time + i * 1.2) * (Math.PI * 2 / (10 + i * 2));
        leaf.style.transform = `translate(${Math.cos(ph * 0.5) * 15}px, ${Math.sin(ph) * 20}px) rotate(${Math.sin(ph * 0.3) * 15}deg)`;
    });
    requestAnimationFrame(animate);
}
animate();

/* Background bubbles */
// ---- Bubbles ----
const bc = document.getElementById('bubbles-container');
let bubblesOK = true;
function createBubble() {
    if (!bubblesOK || document.hidden || bc.childElementCount > (isMobile ? 8 : 16)) return;
    const b = document.createElement('img');
    b.onerror = () => { bubblesOK = false; b.remove(); };
    b.src = BASE + 'bubble.png'; b.className = 'bubble-img'; b.alt = ''; b.decoding = 'async';
    b.style.cssText = `width:${Math.random() * 20 + 10}px;height:auto;left:${Math.random() * 100}%;bottom:-50px;opacity:${Math.random() * 0.4 + 0.2}`;
    const d = Math.random() * 6 + 4;
    b.style.animation = `floatUpImg ${d}s linear forwards`;
    bc.appendChild(b); setTimeout(() => b.remove(), d * 1000);
}
setInterval(createBubble, isMobile ? 1100 : 500);

/* ===== menu-data ===== */
// ---- Menu data ----  [emoji, name, description, kcal, price (thousand toman)]
const MENU = {
    'پاستا': [
        ['🍝', 'پاستا شیراتاکی پومودورو', 'نودل کونجاک با سس گوجه تازه و ریحان.', 15, 189],
        ['🥒', 'پاستا کدو سبز با پستو', 'کدوی اسپیرال با پستوی سبک و سیر.', 18, 175],
        ['🍜', 'اسپاگتی آلفردو سبک', 'اسپاگتی کونجاک با سس خامه‌ای کم‌چرب.', 19, 205]
    ],
    'ساندویچ': [
        ['🥬', 'ساندویچ کاهو و مرغ گریل', 'سینه مرغ گریل لای برگ کاهو و سس ماست.', 16, 165],
        ['🥒', 'ساندویچ خیار و پنیر لایت', 'خیار تازه، پنیر کم‌چرب و نعنا.', 12, 125],
        ['🌯', 'رپ کونجاک و سبزیجات', 'ورقه کونجاک با سبزیجات گریل‌شده.', 18, 155]
    ],
    'برگر': [
        ['🍔', 'برگر کلاسیک زیرو', 'گوشت بدون چربی، کاهو، گوجه و سس مخصوص.', 19, 245],
        ['🍄', 'برگر قارچ پورتوبلو', 'قارچ گریل‌شده با پنیر لایت.', 17, 225],
        ['🥬', 'برگر لتیوس‌رپ', 'برگر بدون نان، لای برگ کاهو تازه.', 14, 215]
    ],
    'پیتزا': [
        ['🍕', 'پیتزا مارگاریتا گل‌کلمی', 'خمیر گل‌کلم، موزارلای لایت و ریحان.', 19, 235],
        ['🥦', 'پیتزا کدو و بروکلی', 'پایه کدو با سبزیجات کبابی.', 17, 225],
        ['🍅', 'مینی‌پیتزا قارچ', 'پیتزای کوچک با قارچ و پنیر کم‌چرب.', 15, 210]
    ],
    'دونات': [
        ['🍩', 'دونات وانیلی زیرو', 'نرم و پفی با گلیز بدون شکر.', 9, 85],
        ['🍓', 'دونات توت‌فرنگی', 'گلیز توت‌فرنگی طبیعی بدون قند.', 10, 90],
        ['🍫', 'دونات کاکائو', 'کاکائوی تلخ با شیرین‌کننده طبیعی.', 11, 95]
    ],
    'دسر': [
        ['🍮', 'ژله میوه‌ای بدون قند', 'ژله خنک با طعم توت و استویا.', 5, 70],
        ['🍰', 'چیزکیک زیرو', 'چیزکیک سبک با پنیر کم‌چرب.', 18, 135],
        ['🍋', 'گرانیتای لیمو', 'یخ ساییده با لیمو و نعنا.', 6, 85]
    ],
    'نوشیدنی': [
        ['🥤', 'نوشابه کلاسیک زیرو', 'نوشابه‌ی خوش‌طعم ما، بدون شکر.', 0, 59],
        ['💚', 'نوشابه زیرو لایم', 'گاز تند و طعم لایم تازه.', 0, 59],
        ['🍃', 'اسپارکلینگ خیار و نعنا', 'آب گازدار با خیار، نعنا و لیمو.', 2, 75]
    ]
};

/* Menu tabs and cards */
const fa = n => n.toLocaleString('fa-IR');
const tabsEl = document.getElementById('menu-tabs'), gridEl = document.getElementById('menu-grid');
// عکس هر آیتم: مقدار ششم (مثلاً 'images/pasta.jpg'). اگر خالی باشد ایموجی نمایش داده می‌شود.
tabsEl.innerHTML = Object.keys(MENU).map(c => `<button class="menu-tab" data-cat="${c}">${c}</button>`).join('');
function renderMenu(cat) {
    tabsEl.querySelectorAll('.menu-tab').forEach(t => t.classList.toggle('active', t.dataset.cat === cat));
    gridEl.innerHTML = MENU[cat].map((it, i) => `<article class="menu-item" style="animation-delay:${i * 70}ms"><div class="thumb${it[5] ? ' has-img' : ''}"><span class="emoji">${it[0]}</span>${it[5] ? `<img src="${it[5]}" alt="${it[1]}" loading="lazy" onerror="this.remove()">` : ''}</div><h3>${it[1]}</h3><p>${it[2]}</p><div class="menu-foot"><span class="kcal">${it[3] === 0 ? '۰' : '≈ ' + fa(it[3])} کالری</span><span class="price">${fa(it[4] * 1000)} تومان</span></div></article>`).join('');
}
tabsEl.addEventListener('click', e => { const t = e.target.closest('.menu-tab'); if (t) { renderMenu(t.dataset.cat); t.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); } });
renderMenu('پاستا');

/* Header, mobile menu, scroll spy */
// ---- Header / mobile hamburger / scroll spy ----
const header = document.getElementById('header'), burger = document.getElementById('burger'), mmenu = document.getElementById('mobile-menu');
let sc = false;
window.addEventListener('scroll', () => { const s = scrollY > 40; if (s !== sc) { sc = s; header.classList.toggle('scrolled', s); } }, { passive: true });
function setMenu(open) {
    burger.classList.toggle('open', open); mmenu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open); mmenu.setAttribute('aria-hidden', !open);
    document.body.style.overflow = open ? 'hidden' : '';
}
burger.addEventListener('click', () => setMenu(!mmenu.classList.contains('open')));
addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
matchMedia('(min-width:901px)').addEventListener('change', e => { if (e.matches) setMenu(false); });
const links = [...document.querySelectorAll('.nav-item, .m-link')];
const spy = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
['home', 'menu', 'space', 'about', 'contact'].forEach(id => spy.observe(document.getElementById(id)));

/* Page transition curtain + smooth section navigation */
// ---- Page transition: curtain slides up with floating food & diet items ----
const CURTAINS = {
    home:    { c: ['#0b8a78', '#033d30'], t: 'خانه', m: 'rise',   e: ['🥤', '💚', '🍋', '🍃', '🫧', '🥒'] },
    menu:    { c: ['#c2410c', '#5c1212'], t: 'منو', m: 'spin',   e: ['🍔', '🍝', '🍕', '🍩', '🥗', '🍰', '🥤', '🥦', '🌯', '🍋', '🥬'] },
    space:   { c: ['#0b4f8a', '#04213f'], t: 'فضای مغازه', m: 'sweep',  e: ['🛋️', '🌿', '🍹', '🎶', '🪴', '☕'] },
    about:   { c: ['#9d174d', '#3b0a21'], t: 'درباره ما', m: 'bounce', e: ['💚', '🥗', '🍎', '🥑', '🍓', '🫐', '🥤'] },
    contact: { c: ['#9a5b13', '#2e1a07'], t: 'تماس با ما', m: 'rise', e: ['📞', '📍', '🕙', '💬', '🍔', '🥤'] }
};
const curtain = document.createElement('div');
curtain.className = 'curtain'; curtain.setAttribute('aria-hidden', 'true');
curtain.innerHTML = '<div class="curtain-bg"></div><div class="curtain-items"></div><div class="curtain-title"></div>';
document.body.appendChild(curtain);
const cItems = curtain.querySelector('.curtain-items'), cTitle = curtain.querySelector('.curtain-title');
const reduceMotion = matchMedia('(prefers-reduced-motion:reduce)').matches;
let busy = false;

function reveal(target, id) {
    if (id === 'menu') { const a = tabsEl.querySelector('.menu-tab.active'); if (a) renderMenu(a.dataset.cat); }
    const els = target.querySelectorAll('.section-head,.menu-tabs,.space-grid,.about .text,.stats,.foot-grid>div');
    if (els.length) gsap.from(els, { y: 50, opacity: 0, duration: .8, stagger: .07, ease: 'power3.out', clearProps: 'transform,opacity' });
}

function goTo(id) {
    const target = document.getElementById(id);
    if (!target) return;
    setMenu(false);
    if (reduceMotion) { target.scrollIntoView({ behavior: 'smooth' }); return; }
    if (busy || (id === 'home' && scrollY < 60)) return;
    busy = true;
    const cfg = CURTAINS[id] || CURTAINS.menu, n = isMobile ? 11 : 18, H = innerHeight * 1.25, W = innerWidth, VH = innerHeight;
    curtain.style.setProperty('--c1', cfg.c[0]); curtain.style.setProperty('--c2', cfg.c[1]);
    cTitle.textContent = cfg.t;
    cItems.innerHTML = Array.from({ length: n }, (_, i) =>
        `<span class="ci" style="left:${((i + .5) / n * 94 + Math.random() * 3).toFixed(1)}%;top:${(8 + Math.random() * 76).toFixed(1)}%;font-size:${((isMobile ? 2 : 2.4) + Math.random() * (isMobile ? 2.2 : 3.2)).toFixed(2)}rem">${cfg.e[i % cfg.e.length]}</span>`).join('');
    document.body.style.overflow = 'hidden';
    gsap.set(curtain, { visibility: 'visible', y: H });
    const tl = gsap.timeline({ onComplete: () => { curtain.style.visibility = 'hidden'; document.body.style.overflow = ''; busy = false; } });
    tl.to(curtain, { y: 0, duration: .7, ease: 'power3.inOut' })
      .fromTo(cTitle, { scale: .5, opacity: 0, y: 60 }, { scale: 1, opacity: 1, y: 0, duration: .55, ease: 'back.out(1.7)' }, .35)
      .add(() => target.scrollIntoView({ behavior: 'instant', block: 'start' }), .85)
      .to(curtain, { y: -H, duration: .7, ease: 'power3.inOut' }, 1.0)
      .to(cTitle, { opacity: 0, y: -50, duration: .3, ease: 'power2.in' }, 1.0)
      .add(() => reveal(target, id), 1.2);
    [...cItems.children].forEach((el, i) => {
        const s = (.4 + Math.random() * 1.2) * VH * .45, d = i % 2 ? 1 : -1;
        if (cfg.m === 'spin') tl.fromTo(el, { y: s, rotation: -220 * d, scale: .5 }, { y: -s, rotation: 260 * d, scale: 1.1, duration: 1.7, ease: 'none' }, 0);
        else if (cfg.m === 'sweep') tl.fromTo(el, { x: d * W * .55, y: s * .6, rotation: -20 }, { x: -d * W * .3, y: -s * .6, rotation: 20, duration: 1.7, ease: 'none' }, 0);
        else if (cfg.m === 'bounce') { tl.fromTo(el, { y: s }, { y: -s, duration: 1.7, ease: 'none' }, 0); tl.fromTo(el, { scale: 0 }, { scale: 1, duration: .9, ease: 'elastic.out(1,.5)' }, .25 + i * .03); }
        else tl.fromTo(el, { y: s, rotation: -12 }, { y: -s, rotation: 12, duration: 1.7, ease: 'none' }, 0);
    });
}
document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    if (!id || !document.getElementById(id)) return;
    e.preventDefault(); goTo(id);
});

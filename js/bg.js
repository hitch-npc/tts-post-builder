/* Рисунок фона: градиентные узоры на шейдерах (WebGL 2).
   Каждый вид — функция field(p) → тон 0…1 по шкале жанра; тон переводится в цвет через OKLab.
   Рисунок рендерится один раз в картинку (data URL) и кладётся слоем под текст — так он попадает и в выгрузку. */
(function () {
  var T = window.TTS = window.TTS || {};

  // порядок — по оценкам на пробном листе (smm/backgrounds/variants-1.html)
  T.ARTS = {
    glass: 'Рифлёное стекло', silk: 'Шёлк', rays: 'Лучи', chrome: 'Хром', moon: 'Луна',
    smoke: 'Дым', steps: 'Ступени', contour: 'Изолинии', grain: 'Зерно', halftone: 'Полутон'
  };

  var KINDS = {
    glass: { gr: .025, f: `
float base(vec2 p){
 vec2 c1=vec2(A*(.25+.5*rnd(2.)),.78+.15*rnd(3.));
 vec2 c2=vec2(A*(.55+.35*rnd(4.)),.5+.2*rnd(5.));
 float t=exp(-dot(p-c1,p-c1)/.05)+.6*exp(-dot(p-c2,p-c2)/.03);
 return t+.12*fbm(p*1.5+O);}
float field(vec2 p){
 float w=.052,x=p.x/w,f=fract(x),id=floor(x);
 vec2 q=vec2((id+.5)*w-(f-.5)*w*1.6,p.y+.012*sin(id*1.7));
 float t=base(q);
 t+=.10*smoothstep(.78,1.,f)*(.4+t);
 t-=.08*(1.-smoothstep(0.,.18,f));
 return clamp(t,0.,1.)*calm(p);}` },
    silk: { gr: .025, f: `
float H(vec2 p){vec2 r=mat2(.8,-.6,.6,.8)*p;
 return sin(r.x*7.+2.2*sn(r*vec2(.7,1.4)+O))*.5+.35*sn(r*vec2(1.,2.2)+O+3.);}
float field(vec2 p){
 float e=.0015;
 float hx=(H(p+vec2(e,0.))-H(p-vec2(e,0.)))/(2.*e);
 float hy=(H(p+vec2(0.,e))-H(p-vec2(0.,e)))/(2.*e);
 vec3 n=normalize(vec3(-hx*.13,-hy*.13,1.));
 vec3 l=normalize(vec3(-.5,.6,.65));
 float dif=max(dot(n,l),0.);
 float spec=pow(max(dot(reflect(-l,n),vec3(0.,0.,1.)),0.),14.);
 float band=.66+.1*sin(p.x*2.3+rnd(6.)*6.28);
 float env=exp(-pow((p.y-band)/.3,2.));
 float t=(smoothstep(.3,1.,dif)*.8+spec*.75)*env;
 return clamp(t,0.,1.)*calm(p);}` },
    rays: { gr: .035, f: `
float field(vec2 p){
 vec2 c=vec2(A*(.15+.7*rnd(10.)),1.25);
 vec2 d=p-c;float r=length(d),a=atan(d.x,-d.y);
 float beams=.6*smoothstep(.1,.9,.5+.5*sn(vec2(a*9.,O.x+r*.6)))
            +.4*smoothstep(.2,1.,.5+.5*sn(vec2(a*23.,O.y+r*.4)));
 float cone=exp(-pow(a/.55,2.));
 float fall=exp(-r*.9);
 float haze=.25*(.5+.5*fbm(p*2.+O));
 float t=(beams*cone*.9+haze*cone)*fall*1.6;
 return clamp(t,0.,1.)*calm(p);}` },
    chrome: { gr: .025, f: `
float field(vec2 p){
 vec2 s=p*.6+O;
 vec2 q=vec2(sn(s),sn(s+vec2(4.1,7.3)));
 float h=sn(s*1.2+1.1*q)+.25*sn(s*2.6+O);
 float band=.5+.5*cos((h*2.6+p.y*1.4)*3.14159);
 float t=pow(band,5.)+.18*pow(band,.8);
 return clamp(t*.95+.04,0.,1.)*calm(p);}` },
    moon: { gr: .025, f: `
float field(vec2 p){
 vec2 c=vec2(A*(.6+.25*(rnd(13.)-.5)),.8);
 vec2 d=(p-c)/.4;float rr=length(d),aa=fwidth(rr)*1.5;
 vec2 dd=rr>.999?d/rr*.999:d;
 vec3 n=vec3(dd,sqrt(max(1.-dot(dd,dd),0.)));
 vec3 l=normalize(vec3(-.55,.55,.6));
 float dif=max(dot(n,l),0.);
 float tex=.5+.5*fbm(dd*2.4+O+n.z*1.5);
 float rim=pow(1.-n.z,3.);
 float sph=dif*(.5+.45*tex)+rim*.3;
 float glow=.24*exp(-(rr-1.)*3.5)*step(1.,rr);
 float t=mix(glow,sph,1.-smoothstep(1.-aa,1.,rr));
 t=max(t,.08*(.5+.5*fbm(p*1.5+O+3.)));
 return clamp(t,0.,1.)*calm(p);}` },
    smoke: { gr: .03, f: `
float field(vec2 p){
 vec2 s=p*.85+O;
 vec2 q=vec2(fbm(s),fbm(s+vec2(5.2,1.3)));
 vec2 r=vec2(fbm(s+2.2*q+vec2(1.7,9.2)),fbm(s+2.2*q+vec2(8.3,2.8)));
 float f=fbm(s+2.2*r);
 float t=smoothstep(.3,.95,.5+.5*f);
 t=mix(t,t*length(q)*1.6,.5);
 return clamp(t,0.,1.)*calm(p);}` },
    steps: { gr: .012, f: `
float field(vec2 p){
 vec2 c=vec2(A*(.65+.3*rnd(11.)),.9+.1*rnd(12.));
 float d=length((p-c)*vec2(1.,1.1));
 float b=(1.-smoothstep(0.,1.05,d+.05*fbm(p*1.6+O)))*calm(p);
 float N=7.,f=b*N,aa=fwidth(f)*1.2;
 return (floor(f)+smoothstep(0.,aa,fract(f)))/N;}` },
    contour: { gr: .02, f: `
float field(vec2 p){
 vec2 c=vec2(A*(.3+.4*rnd(9.)),.82);
 float n=.55*fbm(p*1.3+O)+.9*exp(-dot(p-c,p-c)/.12);
 float v=n*13.;
 float gd=abs(fract(v+.5)-.5);
 float lw=fwidth(v)*max(1.,2.*R.x/1080.);
 float line=1.-smoothstep(lw*.5,lw*1.5,gd);
 float b=clamp(n,0.,1.);
 return clamp(.12*b+line*(.35+.6*b),0.,1.)*calm(p);}` },
    grain: { gr: .02, f: `
float field(vec2 p){
 vec2 c=vec2(A*(.5+.45*(rnd(1.)-.5)*2.),1.08);
 float d=length((p-c)*vec2(.9,1.1));
 float t=1.-smoothstep(.02,1.,d+.14*fbm(p*1.2+O));
 t=pow(clamp(t,0.,1.),1.25)*calm(p);
 float g=h21(gl_FragCoord.xy+O*7.)-.5;
 return t+g*t*(1.-t)*1.7;}` },
    halftone: { gr: 0, f: `
float B(vec2 p){vec2 c=vec2(A*(.3+.5*rnd(7.)),.95);
 return (1.-smoothstep(0.,.85,length((p-c)*vec2(1.,1.2))+.1*fbm(p*2.+O)))*calm(p);}
float field(vec2 p){
 float cs=24./1350.;
 mat2 rot=mat2(.70710678,-.70710678,.70710678,.70710678);
 vec2 g=rot*p/cs,cid=floor(g)+.5,cell=g-cid;
 float bc=B(transpose(rot)*(cid*cs));
 float r=.53*sqrt(max(bc,0.));
 float d=length(cell),aa=max(fwidth(d),.001);
 float dm=(1.-smoothstep(r-aa,r+aa,d))*smoothstep(0.,aa*2.,r);
 return max(dm*.8,B(p)*.16);}` }
  };

  var PRE = `#version 300 es
precision highp float;
uniform vec2 R;uniform float S,CALM,CM,GR;uniform vec3 P[5];
out vec4 o;
#define A .8
#define O vec2(fract(S*.1234)*97.,fract(S*.4321)*89.)
vec3 lab2rgb(vec3 c){
 float l_=c.x+.3963377774*c.y+.2158037573*c.z,m_=c.x-.1055613458*c.y-.0638541728*c.z,s_=c.x-.0894841775*c.y-1.2914855480*c.z;
 float l=l_*l_*l_,m=m_*m_*m_,s=s_*s_*s_;
 return vec3(4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.7076147010*s);}
vec3 toSrgb(vec3 c){c=clamp(c,0.,1.);return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));}
vec3 ramp(float t){t=clamp(t,0.,1.)*4.;
 vec3 c=mix(P[0],P[1],clamp(t,0.,1.));c=mix(c,P[2],clamp(t-1.,0.,1.));c=mix(c,P[3],clamp(t-2.,0.,1.));return mix(c,P[4],clamp(t-3.,0.,1.));}
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec2 mod289(vec2 x){return x-floor(x*(1./289.))*289.;}
vec3 permute(vec3 x){return mod289(((x*34.)+1.)*x);}
float sn(vec2 v){
 const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
 vec2 i=floor(v+dot(v,C.yy)),x0=v-i+dot(i,C.xx);
 vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
 vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod289(i);
 vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
 vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);m=m*m;m=m*m;
 vec3 x=2.*fract(p*C.www)-1.,h=abs(x)-.5,ox=floor(x+.5),a0=x-ox;
 m*=1.79284291400159-.85373472095314*(a0*a0+h*h);
 vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;
 return 130.*dot(m,g);}
float fbm(vec2 p){float s=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){s+=a*sn(p);p=m*p;a*=.5;}return s;}
float h21(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float rnd(float n){return h21(vec2(n*1.37+.5,S*.731+2.3));}
// тише там, где текст: внизу (CM=0) или полосой посередине (CM=1)
float calm(vec2 p){
 float y=gl_FragCoord.y/R.y;
 float low=mix(1.-CALM*.8,1.,smoothstep(.12,.6,y));
 float mid=1.-CALM*.75*exp(-pow((y-.5)/.2,2.));
 return mix(low,mid,CM);}
`;
  var MAIN = `
// масштаб узора — от ширины: в посте и сторис рисунок одного размера, верх совпадает
void main(){float U=R.x*1.25;vec2 p=vec2(gl_FragCoord.x,gl_FragCoord.y-(R.y-U))/U;float t=field(p);
 float g=h21(gl_FragCoord.xy+O*13.)-.5;
 o=vec4(toSrgb(lab2rgb(ramp(t+g*GR))),1.);}`;

  // Шкала: фон поля → самый сильный тон. Тёмная — из --blob-* и подписей тегов, светлая — пастель темы.
  var RAMP = {
    dark:  { cool: ['#15092A', '#06277F', '#3F73E3', '#A3BCFF'], warm: ['#2A1200', '#4A1F00', '#C2410C', '#FB923C'], green: ['#051205', '#0A2A0A', '#16A34A', '#4ADE80'] },
    light: { cool: ['#EAF0FF', '#BFD0EE', '#7A9FFF', '#0436B6'], warm: ['#F2DCC0', '#F2D5B0', '#FB923C', '#C2410C'], green: ['#E4F3E4', '#C7E8C8', '#4ADE80', '#16A34A'] }
  };
  // цвет поля — первая ступень шкалы; совпадает с --smm-bg холста, чтобы текст оставался читаемым
  var FIELD_BG = { paper: '#ECE8DD', stone: '#C6C5BD', graphite: '#1D1E21' };
  var HUE_DARK = { cool: '#06277F', warm: '#4A1F00', green: '#0A2A0A' };

  function lin(c) { c /= 255; return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }
  function oklab(hex) {
    var r = lin(parseInt(hex.slice(1, 3), 16)), g = lin(parseInt(hex.slice(3, 5), 16)), b = lin(parseInt(hex.slice(5, 7), 16));
    var l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
    return [.2104542553 * l + .7936177850 * m - .0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .8086757660 * s];
  }
  function mixLab(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }

  function palette(o) {
    if (o.field === 'cobalt') return ['#0047FF', '#1F5BFF', '#4C7DFF', '#9DB6FF', '#FFFFFF'].map(oklab);
    var dark = o.theme !== 'light', hue = RAMP.dark[o.hue] ? o.hue : 'cool';
    var steps = RAMP[dark ? 'dark' : 'light'][hue].map(oklab), bg;
    if (o.field === 'night') bg = mixLab(oklab('#060709'), oklab(HUE_DARK[hue]), .34);   // как color-mix у поля «Ночь»
    else bg = oklab(FIELD_BG[o.field] || (dark ? '#0D0D0D' : '#F2F1EB'));
    return [bg].concat(steps);
  }

  var glc, gl, vs, buf, progs = {}, cache = {}, order = [];
  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  function init() {
    if (gl !== undefined) return !!gl;
    glc = document.createElement('canvas');
    gl = glc.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false }) || null;
    if (!gl) return false;
    vs = sh(gl.VERTEX_SHADER, '#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0.,1.);}');
    buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    return true;
  }
  function prog(kind) {
    if (progs[kind] !== undefined) return progs[kind];
    progs[kind] = null;
    var fs = sh(gl.FRAGMENT_SHADER, PRE + KINDS[kind].f + MAIN); if (!fs) return null;
    var p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, fs); gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(p)); return null; }
    var u = {}; ['R', 'S', 'CALM', 'CM', 'GR', 'P'].forEach(function (n) { u[n] = gl.getUniformLocation(p, n); });
    return progs[kind] = { p: p, u: u };
  }

  // o: { kind, seed, theme, hue, field, w, h, center } → data URL (JPEG) или '' без WebGL 2
  T.artUrl = function (o) {
    if (!KINDS[o.kind]) return '';
    var key = [o.kind, o.seed, o.theme, o.hue, o.field, o.w, o.h, o.center ? 1 : 0].join('|');
    if (cache[key]) return cache[key];
    if (!init()) return '';
    var pr = prog(o.kind); if (!pr) return '';
    if (glc.width !== o.w || glc.height !== o.h) { glc.width = o.w; glc.height = o.h; }
    gl.viewport(0, 0, o.w, o.h); gl.useProgram(pr.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var pal = []; palette(o).forEach(function (c) { pal.push(c[0], c[1], c[2]); });
    gl.uniform2f(pr.u.R, o.w, o.h); gl.uniform1f(pr.u.S, o.seed % 997 + 1); gl.uniform1f(pr.u.CALM, 1);
    gl.uniform1f(pr.u.CM, o.center ? 1 : 0); gl.uniform1f(pr.u.GR, KINDS[o.kind].gr);
    gl.uniform3fv(pr.u.P, new Float32Array(pal));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    var url = glc.toDataURL('image/jpeg', 0.95);
    cache[key] = url; order.push(key);
    if (order.length > 24) delete cache[order.shift()];
    return url;
  };
  T.artSupported = function () { return init(); };
})();

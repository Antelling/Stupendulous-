var b=Object.defineProperty;var A=(c,t,e)=>t in c?b(c,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):c[t]=e;var n=(c,t,e)=>A(c,typeof t!="symbol"?t+"":t,e);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))s(a);new MutationObserver(a=>{for(const i of a)if(i.type==="childList")for(const r of i.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&s(r)}).observe(document,{childList:!0,subtree:!0});function e(a){const i={};return a.integrity&&(i.integrity=a.integrity),a.referrerPolicy&&(i.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?i.credentials="include":a.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function s(a){if(a.ep)return;a.ep=!0;const i=e(a);fetch(a.href,i)}})();class C{constructor(t){this.gl=t}compile(t,e){const s=this.gl.createShader(t);if(!s)throw new Error("Failed to create shader");if(this.gl.shaderSource(s,e.trim()),this.gl.compileShader(s),!this.gl.getShaderParameter(s,this.gl.COMPILE_STATUS)){const a=this.gl.getShaderInfoLog(s);throw this.gl.deleteShader(s),new Error(`Shader compile error: ${a}`)}return s}linkProgram(t,e,s){const a=this.compile(this.gl.VERTEX_SHADER,t),i=this.compile(this.gl.FRAGMENT_SHADER,e),r=this.gl.createProgram();if(!r)throw new Error("Failed to create program");if(this.gl.attachShader(r,a),this.gl.attachShader(r,i),this.gl.linkProgram(r),this.gl.deleteShader(a),this.gl.deleteShader(i),!this.gl.getProgramParameter(r,this.gl.LINK_STATUS)){const o=this.gl.getProgramInfoLog(r);throw this.gl.deleteProgram(r),new Error(`Program link error (${s}): ${o}`)}return{program:r,name:s}}}class y{constructor(t){this.gl=t}createFloatTexture(t){const e=this.gl.createTexture();if(!e)throw new Error("Failed to create texture");return this.gl.bindTexture(this.gl.TEXTURE_2D,e),this.gl.texImage2D(this.gl.TEXTURE_2D,0,this.gl.RGBA32F,t,t,0,this.gl.RGBA,this.gl.FLOAT,null),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MIN_FILTER,this.gl.NEAREST),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MAG_FILTER,this.gl.NEAREST),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_S,this.gl.CLAMP_TO_EDGE),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_T,this.gl.CLAMP_TO_EDGE),e}createTexturePair(t){return[this.createFloatTexture(t),this.createFloatTexture(t)]}bindTexture(t,e){this.gl.activeTexture(this.gl.TEXTURE0+t),this.gl.bindTexture(this.gl.TEXTURE_2D,e)}}class w{constructor(t){this.gl=t}create(){const t=this.gl.createFramebuffer();if(!t)throw new Error("Failed to create framebuffer");return t}attachColor(t,e){this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER,t,this.gl.TEXTURE_2D,e,0)}checkStatus(){const t=this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);if(t!==this.gl.FRAMEBUFFER_COMPLETE)throw new Error(`Framebuffer incomplete: ${t}`)}bind(t){this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,t)}}class D{constructor(t,e){n(this,"vaos",new Map);this.gl=t,this.quadBuffer=e}createVAOForProgram(t){const e=this.gl.createVertexArray();if(!e)throw new Error("Failed to create VAO");this.gl.bindVertexArray(e),this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.quadBuffer);const s=this.gl.getAttribLocation(t.program,"a_position");return s>=0&&(this.gl.enableVertexAttribArray(s),this.gl.vertexAttribPointer(s,2,this.gl.FLOAT,!1,0,0)),this.gl.bindVertexArray(null),this.vaos.set(t.name,e),e}get(t){return this.vaos.get(t)}bind(t){const e=this.vaos.get(t);e&&this.gl.bindVertexArray(e)}unbind(){this.gl.bindVertexArray(null)}}class E{constructor(t){n(this,"buffer");this.gl=t;const e=t.createBuffer();if(!e)throw new Error("Failed to create buffer");this.buffer=e;const s=new Float32Array([-1,-1,1,-1,-1,1,1,1]);t.bindBuffer(t.ARRAY_BUFFER,this.buffer),t.bufferData(t.ARRAY_BUFFER,s,t.STATIC_DRAW)}bind(){this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.buffer)}draw(){this.gl.drawArrays(this.gl.TRIANGLE_STRIP,0,4)}}class L{constructor(t){this.gl=t}getLocation(t,e){const s=this.gl.getUniformLocation(t,e);if(!s)throw new Error(`Uniform not found: ${e}`);return s}set1f(t,e,s){this.gl.uniform1f(this.getLocation(t,e),s)}set1i(t,e,s){this.gl.uniform1i(this.getLocation(t,e),s)}set2f(t,e,s,a){this.gl.uniform2f(this.getLocation(t,e),s,a)}set1b(t,e,s){this.gl.uniform1i(this.getLocation(t,e),s?1:0)}}class R{constructor(t,e,s,a,i,r){n(this,"stateTextures");n(this,"dataTextures");n(this,"readIndex",0);this.gl=t,this.config=e,this.textures=s,this.framebuffers=a,this.uniforms=i,this.programs=r,this.stateTextures=s.createTexturePair(e.resolution),this.dataTextures=s.createTexturePair(e.resolution)}reset(){this.readIndex=0;const t=this.config.resolution,e=this.gl;e.useProgram(this.programs.init.program),e.bindVertexArray(this.programs.init.vao),this.uniforms.set2f(this.programs.init.program,"u_theta1Range",this.config.theta1Range.min,this.config.theta1Range.max),this.uniforms.set2f(this.programs.init.program,"u_theta2Range",this.config.theta2Range.min,this.config.theta2Range.max),this.uniforms.set1f(this.programs.init.program,"u_omega1",this.config.omega1),this.uniforms.set1f(this.programs.init.program,"u_omega2",this.config.omega2),this.framebuffers.bind(this.framebuffers.create()),this.framebuffers.attachColor(e.COLOR_ATTACHMENT0,this.stateTextures[0]),e.viewport(0,0,t,t),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.useProgram(this.programs.distance.program),e.bindVertexArray(this.programs.distance.vao),this.textures.bindTexture(0,this.stateTextures[0]),this.textures.bindTexture(1,this.dataTextures[0]),this.uniforms.set1i(this.programs.distance.program,"u_stateTexture",0),this.uniforms.set1i(this.programs.distance.program,"u_distanceTexture",1),this.uniforms.set1b(this.programs.distance.program,"u_reset",!0),this.framebuffers.attachColor(e.COLOR_ATTACHMENT0,this.dataTextures[1]),e.drawArrays(e.TRIANGLE_STRIP,0,4),[this.dataTextures[0],this.dataTextures[1]]=[this.dataTextures[1],this.dataTextures[0]],this.framebuffers.bind(null),e.bindVertexArray(null)}step(){const t=this.gl,e=this.config.resolution;for(let s=0;s<this.config.iterationsPerFrame;s++){const a=this.readIndex,i=1-this.readIndex;t.useProgram(this.programs.physics.program),t.bindVertexArray(this.programs.physics.vao),this.textures.bindTexture(0,this.stateTextures[a]),this.uniforms.set1i(this.programs.physics.program,"u_stateTexture",0),this.uniforms.set1f(this.programs.physics.program,"u_dt",this.config.dt),this.framebuffers.bind(this.framebuffers.create()),this.framebuffers.attachColor(t.COLOR_ATTACHMENT0,this.stateTextures[i]),t.viewport(0,0,e,e),t.drawArrays(t.TRIANGLE_STRIP,0,4),t.useProgram(this.programs.distance.program),t.bindVertexArray(this.programs.distance.vao),this.textures.bindTexture(0,this.stateTextures[i]),this.textures.bindTexture(1,this.dataTextures[a]),this.uniforms.set1i(this.programs.distance.program,"u_stateTexture",0),this.uniforms.set1i(this.programs.distance.program,"u_distanceTexture",1),this.uniforms.set1b(this.programs.distance.program,"u_reset",!1),this.framebuffers.attachColor(t.COLOR_ATTACHMENT0,this.dataTextures[i]),t.drawArrays(t.TRIANGLE_STRIP,0,4),this.readIndex=i}}getCurrentDataTexture(){return this.dataTextures[this.readIndex]}}class B{constructor(t,e,s,a,i,r){n(this,"stateATextures");n(this,"stateBTextures");n(this,"dataTextures");n(this,"readIndex",0);this.gl=t,this.config=e,this.textures=s,this.framebuffers=a,this.uniforms=i,this.programs=r,this.stateATextures=s.createTexturePair(e.resolution),this.stateBTextures=s.createTexturePair(e.resolution),this.dataTextures=s.createTexturePair(e.resolution)}getElasticMode(){switch(this.config.system){case"elastic1":return 0;case"elastic2":return 1;case"elastic12":return 2;default:return 0}}reset(){this.readIndex=0;const t=this.config.resolution,e=this.gl,s=this.getElasticMode();e.useProgram(this.programs.initElastic.program),e.bindVertexArray(this.programs.initElastic.vao),this.uniforms.set2f(this.programs.initElastic.program,"u_theta1Range",this.config.theta1Range.min,this.config.theta1Range.max),this.uniforms.set2f(this.programs.initElastic.program,"u_theta2Range",this.config.theta2Range.min,this.config.theta2Range.max),this.uniforms.set1f(this.programs.initElastic.program,"u_omega1",this.config.omega1),this.uniforms.set1f(this.programs.initElastic.program,"u_omega2",this.config.omega2),this.uniforms.set1i(this.programs.initElastic.program,"u_elasticMode",s);const a=this.framebuffers.create();this.framebuffers.bind(a),this.framebuffers.attachColor(e.COLOR_ATTACHMENT0,this.stateATextures[0]),this.framebuffers.attachColor(e.COLOR_ATTACHMENT1,this.stateBTextures[0]),e.drawBuffers([e.COLOR_ATTACHMENT0,e.COLOR_ATTACHMENT1]),e.viewport(0,0,t,t),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.useProgram(this.programs.distanceElastic.program),e.bindVertexArray(this.programs.distanceElastic.vao),this.textures.bindTexture(0,this.stateATextures[0]),this.textures.bindTexture(1,this.stateBTextures[0]),this.textures.bindTexture(2,this.dataTextures[0]),this.uniforms.set1i(this.programs.distanceElastic.program,"u_stateTextureA",0),this.uniforms.set1i(this.programs.distanceElastic.program,"u_stateTextureB",1),this.uniforms.set1i(this.programs.distanceElastic.program,"u_distanceTexture",2),this.uniforms.set1b(this.programs.distanceElastic.program,"u_reset",!0),this.uniforms.set1i(this.programs.distanceElastic.program,"u_elasticMode",s),this.framebuffers.attachColor(e.COLOR_ATTACHMENT0,this.dataTextures[1]),e.drawBuffers([e.COLOR_ATTACHMENT0]),e.drawArrays(e.TRIANGLE_STRIP,0,4),[this.dataTextures[0],this.dataTextures[1]]=[this.dataTextures[1],this.dataTextures[0]],this.framebuffers.bind(null),e.bindVertexArray(null)}step(){const t=this.gl,e=this.config.resolution,s=this.getElasticMode();for(let a=0;a<this.config.iterationsPerFrame;a++){const i=this.readIndex,r=1-this.readIndex;t.useProgram(this.programs.physicsElastic.program),t.bindVertexArray(this.programs.physicsElastic.vao),this.textures.bindTexture(0,this.stateATextures[i]),this.textures.bindTexture(1,this.stateBTextures[i]),this.uniforms.set1i(this.programs.physicsElastic.program,"u_stateTextureA",0),this.uniforms.set1i(this.programs.physicsElastic.program,"u_stateTextureB",1),this.uniforms.set1f(this.programs.physicsElastic.program,"u_dt",this.config.dt),this.uniforms.set1i(this.programs.physicsElastic.program,"u_elasticMode",s),this.uniforms.set1f(this.programs.physicsElastic.program,"u_k1",this.config.k1),this.uniforms.set1f(this.programs.physicsElastic.program,"u_k2",this.config.k2);const o=this.framebuffers.create();this.framebuffers.bind(o),this.framebuffers.attachColor(t.COLOR_ATTACHMENT0,this.stateATextures[r]),this.framebuffers.attachColor(t.COLOR_ATTACHMENT1,this.stateBTextures[r]),t.drawBuffers([t.COLOR_ATTACHMENT0,t.COLOR_ATTACHMENT1]),t.viewport(0,0,e,e),t.drawArrays(t.TRIANGLE_STRIP,0,4),t.useProgram(this.programs.distanceElastic.program),t.bindVertexArray(this.programs.distanceElastic.vao),this.textures.bindTexture(0,this.stateATextures[r]),this.textures.bindTexture(1,this.stateBTextures[r]),this.textures.bindTexture(2,this.dataTextures[i]),this.uniforms.set1i(this.programs.distanceElastic.program,"u_stateTextureA",0),this.uniforms.set1i(this.programs.distanceElastic.program,"u_stateTextureB",1),this.uniforms.set1i(this.programs.distanceElastic.program,"u_distanceTexture",2),this.uniforms.set1b(this.programs.distanceElastic.program,"u_reset",!1),this.uniforms.set1i(this.programs.distanceElastic.program,"u_elasticMode",s),this.framebuffers.attachColor(t.COLOR_ATTACHMENT0,this.dataTextures[r]),t.drawBuffers([t.COLOR_ATTACHMENT0]),t.drawArrays(t.TRIANGLE_STRIP,0,4),this.readIndex=r}}getCurrentDataTexture(){return this.dataTextures[this.readIndex]}}class I{constructor(t,e,s,a,i,r,o){n(this,"stateTextures");n(this,"perturbedTextures");n(this,"dataTextures");n(this,"readIndex",0);n(this,"frameCount",0);n(this,"intervalId",null);n(this,"renderIntervalId",null);this.gl=t,this.config=e,this.textures=s,this.framebuffers=a,this.uniforms=i,this.programs=r,this.onComplete=o,this.stateTextures=s.createTexturePair(e.resolution),this.perturbedTextures=s.createTexturePair(e.resolution),this.dataTextures=s.createTexturePair(e.resolution)}start(){this.stop(),this.frameCount=0,this.readIndex=0,this.reset(),this.intervalId=window.setInterval(()=>{if(this.frameCount>=this.config.maxIter){this.stop(),this.onComplete();return}this.stepBatch()},20),this.renderIntervalId=window.setInterval(()=>this.onComplete(),500)}stop(){this.intervalId!==null&&(clearInterval(this.intervalId),this.intervalId=null),this.renderIntervalId!==null&&(clearInterval(this.renderIntervalId),this.renderIntervalId=null)}reset(){const t=this.gl,e=this.config.resolution;t.useProgram(this.programs.initDivergence.program),t.bindVertexArray(this.programs.initDivergence.vao),this.uniforms.set2f(this.programs.initDivergence.program,"u_theta1Range",this.config.theta1Range.min,this.config.theta1Range.max),this.uniforms.set2f(this.programs.initDivergence.program,"u_theta2Range",this.config.theta2Range.min,this.config.theta2Range.max),this.uniforms.set1f(this.programs.initDivergence.program,"u_omega1",this.config.omega1),this.uniforms.set1f(this.programs.initDivergence.program,"u_omega2",this.config.omega2),this.uniforms.set1f(this.programs.initDivergence.program,"u_perturb",this.config.perturb),this.uniforms.set1f(this.programs.initDivergence.program,"u_seed",this.config.seed);const s=this.framebuffers.create();this.framebuffers.bind(s),this.framebuffers.attachColor(t.COLOR_ATTACHMENT0,this.stateTextures[0]),this.framebuffers.attachColor(t.COLOR_ATTACHMENT1,this.perturbedTextures[0]),this.framebuffers.attachColor(t.COLOR_ATTACHMENT2,this.dataTextures[0]),t.drawBuffers([t.COLOR_ATTACHMENT0,t.COLOR_ATTACHMENT1,t.COLOR_ATTACHMENT2]),t.viewport(0,0,e,e),t.drawArrays(t.TRIANGLE_STRIP,0,4),this.framebuffers.bind(null),t.bindVertexArray(null)}stepBatch(){const t=this.gl,e=this.config.resolution,s=20;for(let a=0;a<s&&!(this.frameCount>=this.config.maxIter);a++){this.frameCount++;const i=this.readIndex,r=1-this.readIndex;t.useProgram(this.programs.divergence.program),t.bindVertexArray(this.programs.divergence.vao),this.textures.bindTexture(0,this.stateTextures[i]),this.textures.bindTexture(1,this.perturbedTextures[i]),this.textures.bindTexture(2,this.dataTextures[i]),this.uniforms.set1i(this.programs.divergence.program,"u_stateTexture",0),this.uniforms.set1i(this.programs.divergence.program,"u_perturbedTexture",1),this.uniforms.set1i(this.programs.divergence.program,"u_divergenceTexture",2),this.uniforms.set1f(this.programs.divergence.program,"u_dt",this.config.dt),this.uniforms.set1f(this.programs.divergence.program,"u_threshold",this.config.threshold),this.uniforms.set1i(this.programs.divergence.program,"u_currentIter",this.frameCount);const o=this.framebuffers.create();this.framebuffers.bind(o),this.framebuffers.attachColor(t.COLOR_ATTACHMENT0,this.stateTextures[r]),this.framebuffers.attachColor(t.COLOR_ATTACHMENT1,this.perturbedTextures[r]),this.framebuffers.attachColor(t.COLOR_ATTACHMENT2,this.dataTextures[r]),t.drawBuffers([t.COLOR_ATTACHMENT0,t.COLOR_ATTACHMENT1,t.COLOR_ATTACHMENT2]),t.viewport(0,0,e,e),t.drawArrays(t.TRIANGLE_STRIP,0,4),this.readIndex=r}}getCurrentDataTexture(){return this.dataTextures[this.readIndex]}getFrameCount(){return this.frameCount}}class S{constructor(t,e,s,a,i,r,o){n(this,"stateATextures");n(this,"stateBTextures");n(this,"perturbedATextures");n(this,"perturbedBTextures");n(this,"dataTextures");n(this,"readIndex",0);n(this,"frameCount",0);n(this,"intervalId",null);n(this,"renderIntervalId",null);this.gl=t,this.config=e,this.textures=s,this.framebuffers=a,this.uniforms=i,this.programs=r,this.onComplete=o,this.stateATextures=s.createTexturePair(e.resolution),this.stateBTextures=s.createTexturePair(e.resolution),this.perturbedATextures=s.createTexturePair(e.resolution),this.perturbedBTextures=s.createTexturePair(e.resolution),this.dataTextures=s.createTexturePair(e.resolution)}getElasticMode(){switch(this.config.system){case"elastic1":return 0;case"elastic2":return 1;case"elastic12":return 2;default:return 0}}start(){this.stop(),this.frameCount=0,this.readIndex=0,this.reset(),this.intervalId=window.setInterval(()=>{if(this.frameCount>=this.config.maxIter){this.stop(),this.onComplete();return}this.stepBatch()},20),this.renderIntervalId=window.setInterval(()=>this.onComplete(),500)}stop(){this.intervalId!==null&&(clearInterval(this.intervalId),this.intervalId=null),this.renderIntervalId!==null&&(clearInterval(this.renderIntervalId),this.renderIntervalId=null)}reset(){const t=this.gl,e=this.config.resolution,s=this.getElasticMode();t.useProgram(this.programs.initElasticDivergence.program),t.bindVertexArray(this.programs.initElasticDivergence.vao),this.uniforms.set2f(this.programs.initElasticDivergence.program,"u_theta1Range",this.config.theta1Range.min,this.config.theta1Range.max),this.uniforms.set2f(this.programs.initElasticDivergence.program,"u_theta2Range",this.config.theta2Range.min,this.config.theta2Range.max),this.uniforms.set1f(this.programs.initElasticDivergence.program,"u_omega1",this.config.omega1),this.uniforms.set1f(this.programs.initElasticDivergence.program,"u_omega2",this.config.omega2),this.uniforms.set1i(this.programs.initElasticDivergence.program,"u_elasticMode",s),this.uniforms.set1f(this.programs.initElasticDivergence.program,"u_perturb",this.config.perturb),this.uniforms.set1f(this.programs.initElasticDivergence.program,"u_seed",this.config.seed);const a=this.framebuffers.create();this.framebuffers.bind(a),this.framebuffers.attachColor(t.COLOR_ATTACHMENT0,this.stateATextures[0]),this.framebuffers.attachColor(t.COLOR_ATTACHMENT1,this.stateBTextures[0]),this.framebuffers.attachColor(t.COLOR_ATTACHMENT2,this.perturbedATextures[0]),this.framebuffers.attachColor(t.COLOR_ATTACHMENT3,this.perturbedBTextures[0]),this.framebuffers.attachColor(t.COLOR_ATTACHMENT4,this.dataTextures[0]),t.drawBuffers([t.COLOR_ATTACHMENT0,t.COLOR_ATTACHMENT1,t.COLOR_ATTACHMENT2,t.COLOR_ATTACHMENT3,t.COLOR_ATTACHMENT4]),t.viewport(0,0,e,e),t.drawArrays(t.TRIANGLE_STRIP,0,4),this.framebuffers.bind(null),t.bindVertexArray(null)}stepBatch(){const t=this.gl,e=this.config.resolution,s=20,a=this.getElasticMode();for(let i=0;i<s&&!(this.frameCount>=this.config.maxIter);i++){this.frameCount++;const r=this.readIndex,o=1-this.readIndex;t.useProgram(this.programs.divergenceElastic.program),t.bindVertexArray(this.programs.divergenceElastic.vao),this.textures.bindTexture(0,this.stateATextures[r]),this.textures.bindTexture(1,this.stateBTextures[r]),this.textures.bindTexture(2,this.perturbedATextures[r]),this.textures.bindTexture(3,this.perturbedBTextures[r]),this.textures.bindTexture(4,this.dataTextures[r]),this.uniforms.set1i(this.programs.divergenceElastic.program,"u_baseTextureA",0),this.uniforms.set1i(this.programs.divergenceElastic.program,"u_baseTextureB",1),this.uniforms.set1i(this.programs.divergenceElastic.program,"u_pertTextureA",2),this.uniforms.set1i(this.programs.divergenceElastic.program,"u_pertTextureB",3),this.uniforms.set1i(this.programs.divergenceElastic.program,"u_divergenceTexture",4),this.uniforms.set1f(this.programs.divergenceElastic.program,"u_dt",this.config.dt),this.uniforms.set1f(this.programs.divergenceElastic.program,"u_threshold",this.config.threshold),this.uniforms.set1i(this.programs.divergenceElastic.program,"u_currentIter",this.frameCount),this.uniforms.set1i(this.programs.divergenceElastic.program,"u_elasticMode",a),this.uniforms.set1f(this.programs.divergenceElastic.program,"u_k1",this.config.k1),this.uniforms.set1f(this.programs.divergenceElastic.program,"u_k2",this.config.k2);const h=this.framebuffers.create();this.framebuffers.bind(h),this.framebuffers.attachColor(t.COLOR_ATTACHMENT0,this.stateATextures[o]),this.framebuffers.attachColor(t.COLOR_ATTACHMENT1,this.stateBTextures[o]),this.framebuffers.attachColor(t.COLOR_ATTACHMENT2,this.perturbedATextures[o]),this.framebuffers.attachColor(t.COLOR_ATTACHMENT3,this.perturbedBTextures[o]),this.framebuffers.attachColor(t.COLOR_ATTACHMENT4,this.dataTextures[o]),t.drawBuffers([t.COLOR_ATTACHMENT0,t.COLOR_ATTACHMENT1,t.COLOR_ATTACHMENT2,t.COLOR_ATTACHMENT3,t.COLOR_ATTACHMENT4]),t.viewport(0,0,e,e),t.drawArrays(t.TRIANGLE_STRIP,0,4),this.readIndex=o}}getCurrentDataTexture(){return this.dataTextures[this.readIndex]}getFrameCount(){return this.frameCount}}class O{constructor(t,e,s,a,i){n(this,"maxValue",0);this.gl=t,this.config=e,this.textures=s,this.uniforms=a,this.programs=i}render(t){const e=this.gl;e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,this.config.resolution,this.config.resolution),e.useProgram(this.programs.render.program),e.bindVertexArray(this.programs.render.vao),this.textures.bindTexture(0,t),this.uniforms.set1i(this.programs.render.program,"u_dataTexture",0),this.uniforms.set1i(this.programs.render.program,"u_colormap",this.config.colormap),this.uniforms.set1i(this.programs.render.program,"u_toneMapping",this.config.toneMapping),this.uniforms.set1f(this.programs.render.program,"u_maxValue",this.maxValue||1),this.uniforms.set1b(this.programs.render.program,"u_isDivergenceMode",this.config.vizMode==="divergence"),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.bindVertexArray(null)}computeMaxValue(t){const e=this.gl,s=this.config.resolution,a=this.config.vizMode==="divergence",i=a?s:Math.min(128,s),r=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,r),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0);const o=new Float32Array(i*i*4);e.viewport(0,0,i,i),e.readPixels(0,0,i,i,e.RGBA,e.FLOAT,o);let h=0;const u=a?0:2;for(let l=0;l<o.length;l+=4){const f=o[l+u];f>h&&isFinite(f)&&(h=f)}this.maxValue=h,e.deleteFramebuffer(r)}getMaxValue(){return this.maxValue}}class p{constructor(t,e){n(this,"zoomHistory",[]);this.config=t,this.onZoomChange=e}get level(){return this.zoomHistory.length+1}applyRectangle(t,e,s,a,i,r){const o=Math.max(0,Math.min(1,Math.min(t,s)/i)),h=Math.max(0,Math.min(1,Math.max(t,s)/i)),u=Math.max(0,Math.min(1,1-Math.max(e,a)/r)),l=Math.max(0,Math.min(1,1-Math.min(e,a)/r)),f=this.config.theta1Range.min+o*(this.config.theta1Range.max-this.config.theta1Range.min),m=this.config.theta1Range.min+h*(this.config.theta1Range.max-this.config.theta1Range.min),g=this.config.theta2Range.min+u*(this.config.theta2Range.max-this.config.theta2Range.min),d=this.config.theta2Range.min+l*(this.config.theta2Range.max-this.config.theta2Range.min);this.zoomHistory.push({theta1:{...this.config.theta1Range},theta2:{...this.config.theta2Range}}),this.config.theta1Range={min:Math.min(f,m),max:Math.max(f,m)},this.config.theta2Range={min:Math.min(g,d),max:Math.max(g,d)},this.onZoomChange()}zoomOut(){if(this.zoomHistory.length>0){const t=this.zoomHistory.pop();this.config.theta1Range=t.theta1,this.config.theta2Range=t.theta2}else this.config.theta1Range={min:-3.14,max:3.14},this.config.theta2Range={min:-3.14,max:3.14};this.onZoomChange()}reset(){this.zoomHistory=[],this.config.theta1Range={min:-3.14,max:3.14},this.config.theta2Range={min:-3.14,max:3.14},this.onZoomChange()}}const P={system:"rigid",vizMode:"distance",resolution:512,theta1Range:{min:-3.14,max:3.14},theta2Range:{min:-3.14,max:3.14},omega1:0,omega2:0,dt:.002,iterationsPerFrame:10,maxIter:5e3,threshold:.05,perturb:1e-5,k1:50,k2:50,colormap:6,toneMapping:0,seed:Math.random()*1e3},z={rigid:"Rigid",elastic1:"Elastic Arm 1",elastic2:"Elastic Arm 2",elastic12:"Both Elastic"},F={distance:"Bob2 Distance",divergence:"Divergence Time"};class q{constructor(){n(this,"elements",{});this.cacheElements()}cacheElements(){const t=["systemType","vizMode","resolution","colormap","toneMapping","theta1Min","theta1Max","theta2Min","theta2Max","omega1","omega2","dt","iterations","maxIter","dtDiv","threshold","perturb","k1","k2","resetBtn","downloadBtn","zoomOutBtn","modeIndicator","subtitle","legendGradient","frameCount","maxDistance","fps","zoomLevel","omega1Value","omega2Value","dtValue","iterValue","dtDivValue","thresholdValue","perturbValue","k1Value","k2Value","distanceControls","elasticControls","divergenceControls","frameRow","maxDistRow"];for(const e of t){const s=document.getElementById(e);s&&(this.elements[e]=s)}}getElement(t){return this.elements[t]??document.getElementById(t)}getInputValue(t){const e=this.getElement(t);return e instanceof HTMLInputElement||e instanceof HTMLSelectElement?e.value:""}setInputValue(t,e){const s=this.getElement(t);(s instanceof HTMLInputElement||s instanceof HTMLSelectElement)&&(s.value=String(e))}setTextContent(t,e){const s=this.getElement(t);s&&(s.textContent=e)}setDisplay(t,e){const s=this.getElement(t);s&&(s.style.display=e)}updateModeUI(t){const e=t.vizMode==="distance",s=t.system!=="rigid",a=t.vizMode==="divergence";this.setDisplay("distanceControls",e?"block":"none"),this.setDisplay("elasticControls",s?"block":"none"),this.setDisplay("divergenceControls",a?"block":"none"),this.setTextContent("modeIndicator",`${z[t.system]} · ${F[t.vizMode]}`);const i={distance:s?"Total distance traveled by bob2 (elastic system)":"Total distance traveled by the second pendulum bob",divergence:"Iterations until perturbed trajectory diverges"};this.setTextContent("subtitle",i[t.vizMode]),this.setDisplay("frameRow",a?"none":"block"),this.setDisplay("maxDistRow",a?"none":"block")}updateLegend(t){const e=this.getElement("legendGradient");e&&(e.className="legend-gradient "+(t===6?"rainbow-gradient":"viridis-gradient"))}updateRangeInputs(t){this.setInputValue("theta1Min",t.theta1Range.min.toFixed(2)),this.setInputValue("theta1Max",t.theta1Range.max.toFixed(2)),this.setInputValue("theta2Min",t.theta2Range.min.toFixed(2)),this.setInputValue("theta2Max",t.theta2Range.max.toFixed(2))}updateStats(t,e,s,a){this.setTextContent("frameCount",String(t)),this.setTextContent("maxDistance",e.toFixed(2)),this.setTextContent("fps",String(s)),this.setTextContent("zoomLevel",String(a))}bindControl(t,e,s="input"){const a=this.getElement(t);a&&(s==="input"&&(a instanceof HTMLInputElement||a instanceof HTMLSelectElement)?a.addEventListener("input",()=>e(a.value)):a.addEventListener("change",()=>e(this.getInputValue(t))))}bindButton(t,e){const s=this.getElement(t);s&&s.addEventListener("click",e)}}class N{constructor(){n(this,"lastTime",performance.now());n(this,"fps",0)}update(t,e,s,a){const i=performance.now();t.vizMode==="divergence"&&a?this.fps=0:this.fps=Math.round(1e3/(i-this.lastTime)),this.lastTime=i}getFps(){return this.fps}}class T{constructor(){n(this,"t1",0);n(this,"o1",0);n(this,"t2",0);n(this,"o2",0)}}class V{constructor(t,e,s){n(this,"canvas");n(this,"ctx");n(this,"visible",!1);n(this,"simulating",!1);n(this,"animId",null);n(this,"debounceTimer",null);n(this,"trail",[]);n(this,"maxTrail",500);n(this,"diverged",!1);n(this,"m1",1);n(this,"m2",1);n(this,"L1",1);n(this,"L2",1);n(this,"g",9.81);n(this,"base",new T);n(this,"pert",new T);n(this,"boxSize",170);n(this,"armScale",55);this.frameEl=t,this.mainCanvas=e,this.config=s,this.canvas=document.getElementById("previewCanvas"),this.ctx=this.canvas.getContext("2d"),this.syncSize(),this.attach()}syncSize(){this.canvas.width=this.mainCanvas.width,this.canvas.height=this.mainCanvas.height}attach(){this.mainCanvas.addEventListener("mousemove",t=>{if(this.config.isDragging)return;const e=this.mainCanvas.getBoundingClientRect(),s=(t.clientX-e.left)*(this.mainCanvas.width/e.width),a=(t.clientY-e.top)*(this.mainCanvas.height/e.height);this.onHover(s,a)}),this.mainCanvas.addEventListener("mouseleave",()=>this.hide()),new ResizeObserver(()=>this.syncSize()).observe(this.frameEl)}onHover(t,e){const s=t/this.mainCanvas.width,a=1-e/this.mainCanvas.height,i=this.config.theta1Range.min+s*(this.config.theta1Range.max-this.config.theta1Range.min),r=this.config.theta2Range.min+a*(this.config.theta2Range.max-this.config.theta2Range.min);this.stopSim(),this.visible=!0,this.simulating=!1,this.diverged=!1,this.trail=[];const o=this.config.perturb;this.base={t1:i,o1:this.config.omega1,t2:r,o2:this.config.omega2},this.pert={t1:i+o,o1:this.config.omega1,t2:r+o,o2:this.config.omega2},this.drawStatic(),clearTimeout(this.debounceTimer??void 0),this.debounceTimer=window.setTimeout(()=>{this.simulating=!0,this.simLoop()},300)}hide(){this.visible=!1,this.stopSim(),clearTimeout(this.debounceTimer??void 0),this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height)}stopSim(){this.simulating=!1,this.animId!==null&&(cancelAnimationFrame(this.animId),this.animId=null)}computeAccel(t,e,s,a){const i=t-s,r=Math.sin(i),o=Math.cos(i),h=this.m1+this.m2*r*r,u=-this.m2*this.L1*e*e*r*o-this.m2*this.L2*a*a*r-(this.m1+this.m2)*this.g*Math.sin(t)+this.m2*this.g*Math.sin(s)*o,l=(this.m1+this.m2)*this.L1*e*e*r+this.m2*this.L2*a*a*r*o+(this.m1+this.m2)*this.g*Math.sin(t)*o-(this.m1+this.m2)*this.g*Math.sin(s);return[u/(this.L1*h),l/(this.L2*h)]}verletStep(t){const e=this.config.dt,s=this.computeAccel(t.t1,t.o1,t.t2,t.o2),a=t.o1+.5*e*s[0],i=t.o2+.5*e*s[1];t.t1+=e*a,t.t2+=e*i;const r=this.computeAccel(t.t1,a,t.t2,i);t.o1=a+.5*e*r[0],t.o2=i+.5*e*r[1]}circularDiff(t,e){const s=Math.PI,a=t-e;return a-2*s*Math.floor(a/(2*s)+.5)}measureDiv(){const t=this.base,e=this.pert,s=this.circularDiff(t.t1,e.t1),a=this.circularDiff(t.t2,e.t2);return Math.sqrt(s*s+a*a+(t.o1-e.o1)**2+(t.o2-e.o2)**2)}bob2Pos(t){const e=this.L1*Math.sin(t.t1),s=-this.L1*Math.cos(t.t1);return{x:e+this.L2*Math.sin(t.t2),y:s-this.L2*Math.cos(t.t2)}}simLoop(){if(!this.simulating||!this.visible)return;const t=15;for(let e=0;e<t;e++)if(this.verletStep(this.base),this.verletStep(this.pert),this.diverged||this.measureDiv()>this.config.threshold&&(this.diverged=!0),!this.diverged){const s=this.bob2Pos(this.base);this.trail.push(s),this.trail.length>this.maxTrail&&this.trail.shift()}this.drawFrame(),this.animId=requestAnimationFrame(()=>this.simLoop())}boxOrigin(){const e=this.boxSize;return{x:16,y:this.canvas.height-16-e,cx:16+e/2,cy:this.canvas.height-16-e/2}}drawStatic(){this.drawFrame()}drawFrame(){const t=this.ctx,e=this.canvas.width,s=this.canvas.height;if(t.clearRect(0,0,e,s),!this.visible)return;const{x:a,y:i,cx:r,cy:o}=this.boxOrigin(),h=this.boxSize,u=this.armScale;t.save(),t.beginPath();const l=10;if(t.moveTo(a+l,i),t.arcTo(a+h,i,a+h,i+h,l),t.arcTo(a+h,i+h,a,i+h,l),t.arcTo(a,i+h,a,i,l),t.arcTo(a,i,a+h,i,l),t.closePath(),t.fillStyle="rgba(8, 10, 16, 0.88)",t.fill(),t.strokeStyle="rgba(255, 255, 255, 0.08)",t.lineWidth=1,t.stroke(),t.restore(),t.save(),t.beginPath(),t.rect(a,i,h,h),t.clip(),this.trail.length>1){t.beginPath();for(let d=0;d<this.trail.length;d++){const v=this.trail[d],M=r+v.x*u,x=o+v.y*u;d===0?t.moveTo(M,x):t.lineTo(M,x)}const g=this.diverged?.5:.7;t.strokeStyle=this.diverged?`rgba(0, 212, 170, ${g})`:"rgba(0, 212, 170, 0.7)",t.lineWidth=1.5,t.stroke(),this.diverged||(t.shadowColor="rgba(0, 212, 170, 0.4)",t.shadowBlur=6,t.strokeStyle="rgba(0, 212, 170, 0.3)",t.lineWidth=1,t.stroke(),t.shadowBlur=0)}this.drawPendulum(this.pert,r,o,u,!0),this.drawPendulum(this.base,r,o,u,!1),t.restore();const f=this.base.t1.toFixed(2),m=this.base.t2.toFixed(2);t.font='500 10px "IBM Plex Mono", monospace',t.fillStyle="rgba(200, 202, 212, 0.7)",t.textAlign="left",t.fillText(`θ₁ ${f}`,a+8,i+h-20),t.fillText(`θ₂ ${m}`,a+8,i+h-8),this.diverged&&(t.font='600 9px "IBM Plex Mono", monospace',t.fillStyle="rgba(232, 160, 48, 0.9)",t.textAlign="right",t.fillText("DIVERGED",a+h-6,i+h-8))}drawPendulum(t,e,s,a,i){const r=this.L1*Math.sin(t.t1),o=-this.L1*Math.cos(t.t1),h=r+this.L2*Math.sin(t.t2),u=o-this.L2*Math.cos(t.t2),l=e+r*a,f=s+o*a,m=e+h*a,g=s+u*a;i?(this.ctx.beginPath(),this.ctx.moveTo(e,s),this.ctx.lineTo(l,f),this.ctx.lineTo(m,g),this.ctx.strokeStyle="rgba(232, 160, 48, 0.35)",this.ctx.lineWidth=1.5,this.ctx.stroke(),this.ctx.beginPath(),this.ctx.arc(l,f,2.5,0,Math.PI*2),this.ctx.fillStyle="rgba(232, 160, 48, 0.3)",this.ctx.fill(),this.ctx.beginPath(),this.ctx.arc(m,g,3,0,Math.PI*2),this.ctx.fillStyle="rgba(232, 160, 48, 0.4)",this.ctx.fill()):(this.ctx.beginPath(),this.ctx.moveTo(e,s),this.ctx.lineTo(l,f),this.ctx.strokeStyle="rgba(200, 202, 212, 0.6)",this.ctx.lineWidth=2,this.ctx.stroke(),this.ctx.beginPath(),this.ctx.moveTo(l,f),this.ctx.lineTo(m,g),this.ctx.strokeStyle="rgba(0, 212, 170, 0.7)",this.ctx.lineWidth=2,this.ctx.stroke(),this.ctx.beginPath(),this.ctx.arc(l,f,3.5,0,Math.PI*2),this.ctx.fillStyle="rgba(200, 202, 212, 0.5)",this.ctx.fill(),this.ctx.beginPath(),this.ctx.arc(m,g,4.5,0,Math.PI*2),this.ctx.fillStyle="#00d4aa",this.ctx.fill(),this.ctx.shadowColor="rgba(0, 212, 170, 0.5)",this.ctx.shadowBlur=8,this.ctx.fill(),this.ctx.shadowBlur=0,this.ctx.beginPath(),this.ctx.arc(e,s,2.5,0,Math.PI*2),this.ctx.fillStyle="rgba(200, 202, 212, 0.4)",this.ctx.fill())}}const H=`#version 300 es
precision highp float;
in vec2 a_position;
out vec2 v_uv;
void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`,k=`#version 300 es
precision highp float;
uniform vec2 u_theta1Range;
uniform vec2 u_theta2Range;
uniform float u_omega1;
uniform float u_omega2;
in vec2 v_uv;
out vec4 fragColor;
void main() {
    float theta1 = mix(u_theta1Range.x, u_theta1Range.y, v_uv.x);
    float theta2 = mix(u_theta2Range.x, u_theta2Range.y, v_uv.y);
    fragColor = vec4(theta1, u_omega1, theta2, u_omega2);
}
`,G=`#version 300 es
precision highp float;
uniform sampler2D u_stateTexture;
uniform float u_dt;
in vec2 v_uv;
out vec4 fragColor;

const float m1 = 1.0;
const float m2 = 1.0;
const float L1 = 1.0;
const float L2 = 1.0;
const float g = 9.81;

vec2 computeAccelerations(float theta1, float omega1, float theta2, float omega2) {
    float delta = theta1 - theta2;
    float sinDelta = sin(delta);
    float cosDelta = cos(delta);
    float denom = m1 + m2 * sinDelta * sinDelta;
    
    float num1 = -m2 * L1 * omega1 * omega1 * sinDelta * cosDelta
               - m2 * L2 * omega2 * omega2 * sinDelta
               - (m1 + m2) * g * sin(theta1)
               + m2 * g * sin(theta2) * cosDelta;
    
    float num2 = (m1 + m2) * L1 * omega1 * omega1 * sinDelta
               + m2 * L2 * omega2 * omega2 * sinDelta * cosDelta
               + (m1 + m2) * g * sin(theta1) * cosDelta
               - (m1 + m2) * g * sin(theta2);
    
    return vec2(num1 / (L1 * denom), num2 / (L2 * denom));
}

void main() {
    vec4 state = texture(u_stateTexture, v_uv);
    float theta1 = state.x, omega1 = state.y, theta2 = state.z, omega2 = state.w;
    
    vec2 accel = computeAccelerations(theta1, omega1, theta2, omega2);
    float omega1_half = omega1 + 0.5 * u_dt * accel.x;
    float omega2_half = omega2 + 0.5 * u_dt * accel.y;
    float theta1_new = theta1 + u_dt * omega1_half;
    float theta2_new = theta2 + u_dt * omega2_half;
    
    vec2 accel_new = computeAccelerations(theta1_new, omega1_half, theta2_new, omega2_half);
    float omega1_new = omega1_half + 0.5 * u_dt * accel_new.x;
    float omega2_new = omega2_half + 0.5 * u_dt * accel_new.y;
    
    fragColor = vec4(theta1_new, omega1_new, theta2_new, omega2_new);
}
`,U=`#version 300 es
precision highp float;
uniform sampler2D u_stateTexture;
uniform sampler2D u_distanceTexture;
uniform bool u_reset;
in vec2 v_uv;
out vec4 fragColor;

void main() {
    vec4 state = texture(u_stateTexture, v_uv);
    float theta1 = state.x, theta2 = state.z;
    
    const float L1 = 1.0, L2 = 1.0;
    float x1 = L1 * sin(theta1);
    float y1 = -L1 * cos(theta1);
    float x2 = x1 + L2 * sin(theta2);
    float y2 = y1 - L2 * cos(theta2);
    
    vec4 prevData = texture(u_distanceTexture, v_uv);
    float totalDist = prevData.z;
    float valid = prevData.w;
    
    float newDist = (u_reset || valid < 0.5) ? 0.0 : totalDist + sqrt((x2-prevData.x)*(x2-prevData.x) + (y2-prevData.y)*(y2-prevData.y));
    fragColor = vec4(x2, y2, newDist, 1.0);
}
`,X=`#version 300 es
precision highp float;

uniform sampler2D u_dataTexture;
uniform int u_colormap;
uniform int u_toneMapping;
uniform float u_maxValue;
uniform bool u_isDivergenceMode;

in vec2 v_uv;
out vec4 fragColor;

vec3 viridis(float t) {
    vec3 c0 = vec3(68.0/255.0, 1.0/255.0, 84.0/255.0);
    vec3 c1 = vec3(33.0/255.0, 145.0/255.0, 140.0/255.0);
    vec3 c2 = vec3(253.0/255.0, 231.0/255.0, 37.0/255.0);
    if (t < 0.5) return mix(c0, c1, t * 2.0);
    return mix(c1, c2, (t - 0.5) * 2.0);
}

vec3 magma(float t) {
    vec3 c0 = vec3(4.0/255.0, 5.0/255.0, 9.0/255.0);
    vec3 c1 = vec3(148.0/255.0, 52.0/255.0, 110.0/255.0);
    vec3 c2 = vec3(252.0/255.0, 253.0/255.0, 191.0/255.0);
    if (t < 0.5) return mix(c0, c1, t * 2.0);
    return mix(c1, c2, (t - 0.5) * 2.0);
}

vec3 plasma(float t) {
    vec3 c0 = vec3(13.0/255.0, 8.0/255.0, 135.0/255.0);
    vec3 c1 = vec3(156.0/255.0, 23.0/255.0, 158.0/255.0);
    vec3 c2 = vec3(240.0/255.0, 249.0/255.0, 33.0/255.0);
    if (t < 0.5) return mix(c0, c1, t * 2.0);
    return mix(c1, c2, (t - 0.5) * 2.0);
}

vec3 inferno(float t) {
    vec3 c0 = vec3(0.0/255.0, 0.0/255.0, 4.0/255.0);
    vec3 c1 = vec3(187.0/255.0, 55.0/255.0, 84.0/255.0);
    vec3 c2 = vec3(252.0/255.0, 255.0/255.0, 164.0/255.0);
    if (t < 0.5) return mix(c0, c1, t * 2.0);
    return mix(c1, c2, (t - 0.5) * 2.0);
}

vec3 turbo(float t) {
    float r = clamp((48.0 + 227.0 * sin((t - 0.5) * 3.14159265)) / 255.0, 0.0, 1.0);
    float g = clamp((t < 0.5 ? t * 400.0 : (1.0 - t) * 400.0) / 255.0, 0.0, 1.0);
    float b = clamp((128.0 + 127.0 * cos(t * 3.14159265)) / 255.0, 0.0, 1.0);
    return vec3(r, g, b);
}

vec3 jet(float t) {
    float r = clamp(t < 0.5 ? 0.0 : (t - 0.5) * 2.0, 0.0, 1.0);
    float g = clamp(t < 0.25 ? t * 4.0 : t < 0.75 ? 1.0 : (1.0 - t) * 4.0, 0.0, 1.0);
    float b = clamp(t < 0.5 ? (0.5 - t) * 2.0 : 0.0, 0.0, 1.0);
    return vec3(r, g, b);
}

vec3 rainbow(float t) {
    float hue = (1.0 - t) * 0.85;
    float s = 1.0, v = 1.0;
    float c = v * s;
    float x = c * (1.0 - abs(mod(hue * 6.0, 2.0) - 1.0));
    float m = v - c;
    vec3 rgb;
    if (hue < 1.0/6.0) rgb = vec3(c, x, 0.0);
    else if (hue < 2.0/6.0) rgb = vec3(x, c, 0.0);
    else if (hue < 3.0/6.0) rgb = vec3(0.0, c, x);
    else if (hue < 4.0/6.0) rgb = vec3(0.0, x, c);
    else if (hue < 5.0/6.0) rgb = vec3(x, 0.0, c);
    else rgb = vec3(c, 0.0, x);
    return rgb + m;
}

vec3 applyColormap(float t, int mode) {
    if (mode == 0) return viridis(t);
    else if (mode == 1) return magma(t);
    else if (mode == 2) return plasma(t);
    else if (mode == 3) return inferno(t);
    else if (mode == 4) return turbo(t);
    else if (mode == 5) return jet(t);
    else return rainbow(t);
}

void main() {
    vec4 data = texture(u_dataTexture, v_uv);
    float value;
    
    if (u_isDivergenceMode) {
        value = data.r;
        if (value <= 0.0) {
            fragColor = vec4(1.0, 1.0, 1.0, 1.0);
            return;
        }
    } else {
        value = data.z;
        if (data.w < 0.5) {
            fragColor = vec4(0.1, 0.1, 0.1, 1.0);
            return;
        }
    }
    
    float t;
    if (u_toneMapping == 0) {
        t = value / u_maxValue;
    } else if (u_toneMapping == 1) {
        t = log(1.0 + value) / log(1.0 + u_maxValue);
    } else if (u_toneMapping == 2) {
        t = sqrt(value / u_maxValue);
    } else {
        float x = value / u_maxValue;
        t = x * x * (3.0 - 2.0 * x);
    }
    
    t = clamp(t, 0.0, 1.0);
    vec3 color = applyColormap(1.0 - t, u_colormap);
    fragColor = vec4(color, 1.0);
}
`,$=`#version 300 es
precision highp float;
uniform vec2 u_theta1Range;
uniform vec2 u_theta2Range;
uniform float u_omega1;
uniform float u_omega2;
uniform float u_perturb;
uniform float u_seed;
in vec2 v_uv;
layout(location = 0) out vec4 baseState;
layout(location = 1) out vec4 perturbedState;
layout(location = 2) out vec4 divergenceData;
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
void main() {
    float theta1 = mix(u_theta1Range.x, u_theta1Range.y, v_uv.x);
    float theta2 = mix(u_theta2Range.x, u_theta2Range.y, v_uv.y);
    float r = hash(v_uv * 1000.0 + u_seed);
    float perturb_theta1 = (r - 0.5) * 2.0 * u_perturb;
    float perturb_theta2 = (hash(v_uv * 1000.0 + vec2(100.0, u_seed)) - 0.5) * 2.0 * u_perturb;
    baseState = vec4(theta1, u_omega1, theta2, u_omega2);
    perturbedState = vec4(theta1 + perturb_theta1, u_omega1, theta2 + perturb_theta2, u_omega2);
    divergenceData = vec4(0.0, 0.0, 0.0, 1.0);
}
`,Z=`#version 300 es
precision highp float;
uniform sampler2D u_stateTexture;
uniform sampler2D u_perturbedTexture;
uniform sampler2D u_divergenceTexture;
uniform float u_dt;
uniform float u_threshold;
uniform int u_currentIter;
in vec2 v_uv;
layout(location = 0) out vec4 baseState;
layout(location = 1) out vec4 perturbedState;
layout(location = 2) out vec4 divergenceData;
const float m1 = 1.0;
const float m2 = 1.0;
const float L1 = 1.0;
const float L2 = 1.0;
const float g = 9.81;
const float PI = 3.14159265359;
vec2 computeAccelerations(float theta1, float omega1, float theta2, float omega2) {
    float delta = theta1 - theta2;
    float sinDelta = sin(delta);
    float cosDelta = cos(delta);
    float denom = m1 + m2 * sinDelta * sinDelta;
    float num1 = -m2 * L1 * omega1 * omega1 * sinDelta * cosDelta
               - m2 * L2 * omega2 * omega2 * sinDelta
               - (m1 + m2) * g * sin(theta1)
               + m2 * g * sin(theta2) * cosDelta;
    float num2 = (m1 + m2) * L1 * omega1 * omega1 * sinDelta
               + m2 * L2 * omega2 * omega2 * sinDelta * cosDelta
               + (m1 + m2) * g * sin(theta1) * cosDelta
               - (m1 + m2) * g * sin(theta2);
    return vec2(num1 / (L1 * denom), num2 / (L2 * denom));
}
void verletStep(inout float theta1, inout float omega1, inout float theta2, inout float omega2) {
    vec2 accel = computeAccelerations(theta1, omega1, theta2, omega2);
    float omega1_half = omega1 + 0.5 * u_dt * accel.x;
    float omega2_half = omega2 + 0.5 * u_dt * accel.y;
    theta1 += u_dt * omega1_half;
    theta2 += u_dt * omega2_half;
    vec2 accel_new = computeAccelerations(theta1, omega1_half, theta2, omega2_half);
    omega1 = omega1_half + 0.5 * u_dt * accel_new.x;
    omega2 = omega2_half + 0.5 * u_dt * accel_new.y;
}
float circularDiff(float a, float b) {
    float d = a - b;
    return d - 2.0 * PI * floor(d / (2.0 * PI) + 0.5);
}
float measureDivergence(float t1a, float o1a, float t2a, float o2a, float t1b, float o1b, float t2b, float o2b) {
    float d1 = circularDiff(t1a, t1b);
    float d2 = circularDiff(t2a, t2b);
    return sqrt(d1*d1 + d2*d2 + (o1a-o1b)*(o1a-o1b) + (o2a-o2b)*(o2a-o2b));
}
void main() {
    vec4 base = texture(u_stateTexture, v_uv);
    vec4 pert = texture(u_perturbedTexture, v_uv);
    vec4 div = texture(u_divergenceTexture, v_uv);
    float iter = div.r;
    float hasDiv = div.g;
    verletStep(base.x, base.y, base.z, base.w);
    verletStep(pert.x, pert.y, pert.z, pert.w);
    if (hasDiv < 0.5) {
        float dist = measureDivergence(base.x, base.y, base.z, base.w, pert.x, pert.y, pert.z, pert.w);
        if (dist > u_threshold) {
            iter = float(u_currentIter);
            hasDiv = 1.0;
        }
    }
    baseState = base;
    perturbedState = pert;
    divergenceData = vec4(iter, hasDiv, 0.0, 1.0);
}
`,W=`#version 300 es
precision highp float;
uniform vec2 u_theta1Range;
uniform vec2 u_theta2Range;
uniform float u_omega1;
uniform float u_omega2;
uniform int u_elasticMode;
in vec2 v_uv;
layout(location = 0) out vec4 stateA;
layout(location = 1) out vec4 stateB;
void main() {
    float theta1 = mix(u_theta1Range.x, u_theta1Range.y, v_uv.x);
    float theta2 = mix(u_theta2Range.x, u_theta2Range.y, v_uv.y);
    if (u_elasticMode == 0) {
        stateA = vec4(theta1, u_omega1, 0.0, 0.0);
        stateB = vec4(theta2, u_omega2, 0.0, 1.0);
    } else if (u_elasticMode == 1) {
        stateA = vec4(theta1, u_omega1, theta2, u_omega2);
        stateB = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        stateA = vec4(theta1, u_omega1, 0.0, 0.0);
        stateB = vec4(theta2, u_omega2, 0.0, 0.0);
    }
}
`,Y=`#version 300 es
precision highp float;
uniform sampler2D u_stateTextureA;
uniform sampler2D u_stateTextureB;
uniform float u_dt;
uniform int u_elasticMode;
uniform float u_k1;
uniform float u_k2;
in vec2 v_uv;
layout(location = 0) out vec4 outStateA;
layout(location = 1) out vec4 outStateB;

const float M1 = 1.0;
const float M2 = 1.0;
const float G  = 9.81;
const float TOTAL_M = M1 + M2;
const float L10 = 1.0;
const float L20 = 1.0;

vec3 solveCramer3(mat3 M, vec3 f) {
    float det = M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1])
              - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0])
              + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
    float invDet = 1.0 / det;
    float x0 = f.x   * (M[1][1] * M[2][2] - M[1][2] * M[2][1])
              - M[0][1] * (f.y   * M[2][2] - M[1][2] * f.z)
              + M[0][2] * (f.y   * M[2][1] - M[1][1] * f.z);
    float x1 = M[0][0] * (f.y   * M[2][2] - M[1][2] * f.z)
              - f.x     * (M[1][0] * M[2][2] - M[1][2] * M[2][0])
              + M[0][2] * (M[1][0] * f.z   - f.y     * M[2][0]);
    float x2 = M[0][0] * (M[1][1] * f.z   - f.y     * M[2][1])
              - M[0][1] * (M[1][0] * f.z   - f.y     * M[2][0])
              + f.x     * (M[1][1] * M[2][0] - M[1][0] * M[2][1]);
    return vec3(x0, x1, x2) * invDet;
}

void systemDerivA(
    float theta1, float omega1, float r1, float rdot1,
    float theta2, float omega2,
    out vec4 da, out vec4 db
) {
    float l1 = L10 + r1;
    float delta = theta1 - theta2;
    float sinD = sin(delta);
    float cosD = cos(delta);
    float l1sq = l1 * l1;
    float L2sq = L20 * L20;
    float w1sq = omega1 * omega1;
    float w2sq = omega2 * omega2;

    mat3 M;
    M[0][0] = TOTAL_M * l1sq;  M[0][1] = 0.0;                    M[0][2] = M2 * L20 * l1 * cosD;
    M[1][0] = 0.0;              M[1][1] = TOTAL_M;                M[1][2] = M2 * L20 * sinD;
    M[2][0] = M2 * L20 * l1 * cosD; M[2][1] = M2 * L20 * sinD;  M[2][2] = M2 * L2sq;

    vec3 f;
    f.x = -2.0 * TOTAL_M * l1 * rdot1 * omega1
          - M2 * L20 * l1 * w2sq * sinD
          - TOTAL_M * G * l1 * sin(theta1);
    f.y = TOTAL_M * l1 * w1sq
          + M2 * L20 * w2sq * cosD
          + TOTAL_M * G * cos(theta1)
          - u_k1 * r1;
    f.z = -2.0 * M2 * L20 * rdot1 * omega1 * cosD
          + M2 * L20 * l1 * w1sq * sinD
          - M2 * G * L20 * sin(theta2);

    vec3 accel = solveCramer3(M, f);
    da = vec4(omega1, accel.x, rdot1, accel.y);
    db = vec4(omega2, accel.z, 0.0, 0.0);
}

void systemDerivB(
    float theta1, float omega1,
    float theta2, float omega2, float r2, float rdot2,
    out vec4 da, out vec4 db
) {
    float l2 = L20 + r2;
    float delta = theta1 - theta2;
    float sinD = sin(delta);
    float cosD = cos(delta);
    float L1sq = L10 * L10;
    float l2sq = l2 * l2;
    float w1sq = omega1 * omega1;
    float w2sq = omega2 * omega2;

    mat3 M;
    M[0][0] = TOTAL_M * L1sq;      M[0][1] = M2 * L10 * l2 * cosD; M[0][2] = -M2 * L10 * sinD;
    M[1][0] = M2 * L10 * l2 * cosD; M[1][1] = M2 * l2sq;            M[1][2] = 0.0;
    M[2][0] = -M2 * L10 * sinD;    M[2][1] = 0.0;                   M[2][2] = M2;

    vec3 f;
    f.x = -2.0 * M2 * L10 * rdot2 * omega2 * cosD
          - M2 * L10 * l2 * w2sq * sinD
          - TOTAL_M * G * L10 * sin(theta1);
    f.y = -2.0 * M2 * l2 * rdot2 * omega2
          + M2 * L10 * l2 * w1sq * sinD
          - M2 * G * l2 * sin(theta2);
    f.z = M2 * l2 * w2sq
          + M2 * L10 * w1sq * cosD
          + M2 * G * cos(theta2)
          - u_k2 * r2;

    vec3 accel = solveCramer3(M, f);
    da = vec4(omega1, accel.x, 0.0, 0.0);
    db = vec4(omega2, accel.y, rdot2, accel.z);
}

float det4(mat4 M) {
    float d00 = M[1][1]*(M[2][2]*M[3][3] - M[2][3]*M[3][2])
              - M[1][2]*(M[2][1]*M[3][3] - M[2][3]*M[3][1])
              + M[1][3]*(M[2][1]*M[3][2] - M[2][2]*M[3][1]);
    float d01 = M[1][0]*(M[2][2]*M[3][3] - M[2][3]*M[3][2])
              - M[1][2]*(M[2][0]*M[3][3] - M[2][3]*M[3][0])
              + M[1][3]*(M[2][0]*M[3][2] - M[2][2]*M[3][0]);
    float d02 = M[1][0]*(M[2][1]*M[3][3] - M[2][3]*M[3][1])
              - M[1][1]*(M[2][0]*M[3][3] - M[2][3]*M[3][0])
              + M[1][3]*(M[2][0]*M[3][1] - M[2][1]*M[3][0]);
    float d03 = M[1][0]*(M[2][1]*M[3][2] - M[2][2]*M[3][1])
              - M[1][1]*(M[2][0]*M[3][2] - M[2][2]*M[3][0])
              + M[1][2]*(M[2][0]*M[3][1] - M[2][1]*M[3][0]);
    return M[0][0]*d00 - M[0][1]*d01 + M[0][2]*d02 - M[0][3]*d03;
}

vec4 solveCramer4(mat4 M, vec4 f) {
    float det = det4(M);
    float invDet = 1.0 / det;
    mat4 M0 = M; M0[0][0] = f.x; M0[1][0] = f.y; M0[2][0] = f.z; M0[3][0] = f.w;
    mat4 M1 = M; M1[0][1] = f.x; M1[1][1] = f.y; M1[2][1] = f.z; M1[3][1] = f.w;
    mat4 M2m = M; M2m[0][2] = f.x; M2m[1][2] = f.y; M2m[2][2] = f.z; M2m[3][2] = f.w;
    mat4 M3 = M; M3[0][3] = f.x; M3[1][3] = f.y; M3[2][3] = f.z; M3[3][3] = f.w;
    return vec4(det4(M0), det4(M1), det4(M2m), det4(M3)) * invDet;
}

void systemDerivC(
    float theta1, float omega1, float r1, float rdot1,
    float theta2, float omega2, float r2, float rdot2,
    out vec4 da, out vec4 db
) {
    float l1 = L10 + r1;
    float l2 = L20 + r2;
    float delta = theta1 - theta2;
    float sinD = sin(delta);
    float cosD = cos(delta);
    float l1sq = l1 * l1;
    float l2sq = l2 * l2;
    float w1sq = omega1 * omega1;
    float w2sq = omega2 * omega2;

    mat4 M;
    M[0][0] = TOTAL_M * l1sq; M[0][1] = 0.0;               M[0][2] = M2 * l1 * l2 * cosD; M[0][3] = -M2 * l1 * sinD;
    M[1][0] = 0.0;            M[1][1] = TOTAL_M;            M[1][2] = M2 * l2 * sinD;      M[1][3] = M2 * cosD;
    M[2][0] = M2*l1*l2*cosD;  M[2][1] = M2 * l2 * sinD;    M[2][2] = M2 * l2sq;            M[2][3] = 0.0;
    M[3][0] = -M2 * l1*sinD;  M[3][1] = M2 * cosD;         M[3][2] = 0.0;                  M[3][3] = M2;

    vec4 f;
    f.x = -2.0 * TOTAL_M * l1 * rdot1 * omega1
          - 2.0 * M2 * l1 * rdot2 * omega2 * cosD
          - M2 * l1 * l2 * w2sq * sinD
          - TOTAL_M * G * l1 * sin(theta1);
    f.y = TOTAL_M * l1 * w1sq
          + M2 * l2 * w2sq * cosD
          - 2.0 * M2 * rdot2 * omega2 * sinD
          + TOTAL_M * G * cos(theta1)
          - u_k1 * r1;
    f.z = -2.0 * M2 * l2 * rdot1 * omega1 * cosD
          - 2.0 * M2 * l2 * rdot2 * omega2
          + M2 * l1 * l2 * w1sq * sinD
          - M2 * G * l2 * sin(theta2);
    f.w = 2.0 * M2 * rdot1 * omega1 * sinD
          + M2 * l1 * w1sq * cosD
          + M2 * l2 * w2sq
          + M2 * G * cos(theta2)
          - u_k2 * r2;

    vec4 accel = solveCramer4(M, f);
    da = vec4(omega1, accel.x, rdot1, accel.y);
    db = vec4(omega2, accel.z, rdot2, accel.w);
}

void elasticDeriv(int mode, vec4 sa, vec4 sb, out vec4 da, out vec4 db) {
    if (mode == 0) {
        systemDerivA(sa.x, sa.y, sa.z, sa.w, sb.x, sb.y, da, db);
    } else if (mode == 1) {
        systemDerivB(sa.x, sa.y, sb.x, sb.y, sb.z, sb.w, da, db);
    } else {
        systemDerivC(sa.x, sa.y, sa.z, sa.w, sb.x, sb.y, sb.z, sb.w, da, db);
    }
}

void main() {
    vec4 sa = texture(u_stateTextureA, v_uv);
    vec4 sb = texture(u_stateTextureB, v_uv);

    vec4 ca, cb;
    if (u_elasticMode == 0) {
        ca = sa;
        cb = vec4(sb.x, sb.y, 0.0, 0.0);
    } else if (u_elasticMode == 1) {
        ca = vec4(sa.x, sa.y, 0.0, 0.0);
        cb = vec4(sa.z, sa.w, sb.x, sb.y);
    } else {
        ca = sa;
        cb = sb;
    }

    float dt = u_dt;
    vec4 da1, db1, da2, db2, da3, db3, da4, db4;
    elasticDeriv(u_elasticMode, ca, cb, da1, db1);
    elasticDeriv(u_elasticMode, ca + 0.5*dt*da1, cb + 0.5*dt*db1, da2, db2);
    elasticDeriv(u_elasticMode, ca + 0.5*dt*da2, cb + 0.5*dt*db2, da3, db3);
    elasticDeriv(u_elasticMode, ca + dt*da3, cb + dt*db3, da4, db4);

    vec4 newCA = ca + (dt / 6.0) * (da1 + 2.0*da2 + 2.0*da3 + da4);
    vec4 newCB = cb + (dt / 6.0) * (db1 + 2.0*db2 + 2.0*db3 + db4);

    if (u_elasticMode == 0) {
        outStateA = newCA;
        outStateB = vec4(newCB.x, newCB.y, 0.0, 1.0);
    } else if (u_elasticMode == 1) {
        outStateA = vec4(newCA.x, newCA.y, newCB.x, newCB.y);
        outStateB = vec4(newCB.z, newCB.w, 0.0, 1.0);
    } else {
        outStateA = newCA;
        outStateB = newCB;
    }
}
`,j=`#version 300 es
precision highp float;
uniform sampler2D u_stateTextureA;
uniform sampler2D u_stateTextureB;
uniform sampler2D u_distanceTexture;
uniform bool u_reset;
uniform int u_elasticMode;
in vec2 v_uv;
out vec4 fragColor;
void main() {
    vec4 sa = texture(u_stateTextureA, v_uv);
    vec4 sb = texture(u_stateTextureB, v_uv);

    float theta1, theta2, r1, r2;
    if (u_elasticMode == 0) {
        theta1 = sa.x; theta2 = sb.x;
        r1 = sa.z; r2 = 0.0;
    } else if (u_elasticMode == 1) {
        theta1 = sa.x; theta2 = sa.z;
        r1 = 0.0; r2 = sb.x;
    } else {
        theta1 = sa.x; theta2 = sb.x;
        r1 = sa.z; r2 = sb.z;
    }

    float l1 = 1.0 + r1;
    float l2 = 1.0 + r2;
    float x1 = l1 * sin(theta1);
    float y1 = -l1 * cos(theta1);
    float x2 = x1 + l2 * sin(theta2);
    float y2 = y1 - l2 * cos(theta2);

    vec4 prevData = texture(u_distanceTexture, v_uv);
    float totalDist = prevData.z;
    float valid = prevData.w;

    float newDist = (u_reset || valid < 0.5) ? 0.0 : totalDist + sqrt((x2-prevData.x)*(x2-prevData.x) + (y2-prevData.y)*(y2-prevData.y));
    fragColor = vec4(x2, y2, newDist, 1.0);
}
`,K=`#version 300 es
precision highp float;
uniform vec2 u_theta1Range;
uniform vec2 u_theta2Range;
uniform float u_omega1;
uniform float u_omega2;
uniform int u_elasticMode;
uniform float u_perturb;
uniform float u_seed;
in vec2 v_uv;
layout(location = 0) out vec4 baseA;
layout(location = 1) out vec4 baseB;
layout(location = 2) out vec4 pertAOut;
layout(location = 3) out vec4 pertBOut;
layout(location = 4) out vec4 divergenceData;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
    float theta1 = mix(u_theta1Range.x, u_theta1Range.y, v_uv.x);
    float theta2 = mix(u_theta2Range.x, u_theta2Range.y, v_uv.y);
    float r = hash(v_uv * 1000.0 + u_seed);
    float perturb_theta1 = (r - 0.5) * 2.0 * u_perturb;
    float perturb_theta2 = (hash(v_uv * 1000.0 + vec2(100.0, u_seed)) - 0.5) * 2.0 * u_perturb;
    float pt1 = theta1 + perturb_theta1;
    float pt2 = theta2 + perturb_theta2;

    if (u_elasticMode == 0) {
        baseA = vec4(theta1, u_omega1, 0.0, 0.0);
        baseB = vec4(theta2, u_omega2, 0.0, 1.0);
        pertAOut = vec4(pt1, u_omega1, 0.0, 0.0);
        pertBOut = vec4(pt2, u_omega2, 0.0, 1.0);
    } else if (u_elasticMode == 1) {
        baseA = vec4(theta1, u_omega1, theta2, u_omega2);
        baseB = vec4(0.0, 0.0, 0.0, 1.0);
        pertAOut = vec4(pt1, u_omega1, pt2, u_omega2);
        pertBOut = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        baseA = vec4(theta1, u_omega1, 0.0, 0.0);
        baseB = vec4(theta2, u_omega2, 0.0, 0.0);
        pertAOut = vec4(pt1, u_omega1, 0.0, 0.0);
        pertBOut = vec4(pt2, u_omega2, 0.0, 0.0);
    }

    divergenceData = vec4(0.0, 0.0, 0.0, 1.0);
}
`,Q=`#version 300 es
precision highp float;
uniform sampler2D u_baseTextureA;
uniform sampler2D u_baseTextureB;
uniform sampler2D u_pertTextureA;
uniform sampler2D u_pertTextureB;
uniform sampler2D u_divergenceTexture;
uniform float u_dt;
uniform float u_threshold;
uniform int u_currentIter;
uniform int u_elasticMode;
uniform float u_k1;
uniform float u_k2;
in vec2 v_uv;
layout(location = 0) out vec4 outBaseA;
layout(location = 1) out vec4 outBaseB;
layout(location = 2) out vec4 outPertA;
layout(location = 3) out vec4 outPertB;
layout(location = 4) out vec4 divergenceData;

const float M1 = 1.0;
const float M2 = 1.0;
const float G  = 9.81;
const float TOTAL_M = M1 + M2;
const float L10 = 1.0;
const float L20 = 1.0;
const float PI = 3.14159265359;

vec3 solveCramer3(mat3 M, vec3 f) {
    float det = M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1])
              - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0])
              + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
    float invDet = 1.0 / det;
    float x0 = f.x   * (M[1][1] * M[2][2] - M[1][2] * M[2][1])
              - M[0][1] * (f.y   * M[2][2] - M[1][2] * f.z)
              + M[0][2] * (f.y   * M[2][1] - M[1][1] * f.z);
    float x1 = M[0][0] * (f.y   * M[2][2] - M[1][2] * f.z)
              - f.x     * (M[1][0] * M[2][2] - M[1][2] * M[2][0])
              + M[0][2] * (M[1][0] * f.z   - f.y     * M[2][0]);
    float x2 = M[0][0] * (M[1][1] * f.z   - f.y     * M[2][1])
              - M[0][1] * (M[1][0] * f.z   - f.y     * M[2][0])
              + f.x     * (M[1][1] * M[2][0] - M[1][0] * M[2][1]);
    return vec3(x0, x1, x2) * invDet;
}

void systemDerivA(
    float theta1, float omega1, float r1, float rdot1,
    float theta2, float omega2,
    out vec4 da, out vec4 db
) {
    float l1 = L10 + r1;
    float delta = theta1 - theta2;
    float sinD = sin(delta);
    float cosD = cos(delta);
    float l1sq = l1 * l1;
    float L2sq = L20 * L20;
    float w1sq = omega1 * omega1;
    float w2sq = omega2 * omega2;

    mat3 M;
    M[0][0] = TOTAL_M * l1sq;  M[0][1] = 0.0;                    M[0][2] = M2 * L20 * l1 * cosD;
    M[1][0] = 0.0;              M[1][1] = TOTAL_M;                M[1][2] = M2 * L20 * sinD;
    M[2][0] = M2 * L20 * l1 * cosD; M[2][1] = M2 * L20 * sinD;  M[2][2] = M2 * L2sq;

    vec3 f;
    f.x = -2.0 * TOTAL_M * l1 * rdot1 * omega1
          - M2 * L20 * l1 * w2sq * sinD
          - TOTAL_M * G * l1 * sin(theta1);
    f.y = TOTAL_M * l1 * w1sq
          + M2 * L20 * w2sq * cosD
          + TOTAL_M * G * cos(theta1)
          - u_k1 * r1;
    f.z = -2.0 * M2 * L20 * rdot1 * omega1 * cosD
          + M2 * L20 * l1 * w1sq * sinD
          - M2 * G * L20 * sin(theta2);

    vec3 accel = solveCramer3(M, f);
    da = vec4(omega1, accel.x, rdot1, accel.y);
    db = vec4(omega2, accel.z, 0.0, 0.0);
}

void systemDerivB(
    float theta1, float omega1,
    float theta2, float omega2, float r2, float rdot2,
    out vec4 da, out vec4 db
) {
    float l2 = L20 + r2;
    float delta = theta1 - theta2;
    float sinD = sin(delta);
    float cosD = cos(delta);
    float L1sq = L10 * L10;
    float l2sq = l2 * l2;
    float w1sq = omega1 * omega1;
    float w2sq = omega2 * omega2;

    mat3 M;
    M[0][0] = TOTAL_M * L1sq;      M[0][1] = M2 * L10 * l2 * cosD; M[0][2] = -M2 * L10 * sinD;
    M[1][0] = M2 * L10 * l2 * cosD; M[1][1] = M2 * l2sq;            M[1][2] = 0.0;
    M[2][0] = -M2 * L10 * sinD;    M[2][1] = 0.0;                   M[2][2] = M2;

    vec3 f;
    f.x = -2.0 * M2 * L10 * rdot2 * omega2 * cosD
          - M2 * L10 * l2 * w2sq * sinD
          - TOTAL_M * G * L10 * sin(theta1);
    f.y = -2.0 * M2 * l2 * rdot2 * omega2
          + M2 * L10 * l2 * w1sq * sinD
          - M2 * G * l2 * sin(theta2);
    f.z = M2 * l2 * w2sq
          + M2 * L10 * w1sq * cosD
          + M2 * G * cos(theta2)
          - u_k2 * r2;

    vec3 accel = solveCramer3(M, f);
    da = vec4(omega1, accel.x, 0.0, 0.0);
    db = vec4(omega2, accel.y, rdot2, accel.z);
}

float det4(mat4 M) {
    float d00 = M[1][1]*(M[2][2]*M[3][3] - M[2][3]*M[3][2])
              - M[1][2]*(M[2][1]*M[3][3] - M[2][3]*M[3][1])
              + M[1][3]*(M[2][1]*M[3][2] - M[2][2]*M[3][1]);
    float d01 = M[1][0]*(M[2][2]*M[3][3] - M[2][3]*M[3][2])
              - M[1][2]*(M[2][0]*M[3][3] - M[2][3]*M[3][0])
              + M[1][3]*(M[2][0]*M[3][2] - M[2][2]*M[3][0]);
    float d02 = M[1][0]*(M[2][1]*M[3][3] - M[2][3]*M[3][1])
              - M[1][1]*(M[2][0]*M[3][3] - M[2][3]*M[3][0])
              + M[1][3]*(M[2][0]*M[3][1] - M[2][1]*M[3][0]);
    float d03 = M[1][0]*(M[2][1]*M[3][2] - M[2][2]*M[3][1])
              - M[1][1]*(M[2][0]*M[3][2] - M[2][2]*M[3][0])
              + M[1][2]*(M[2][0]*M[3][1] - M[2][1]*M[3][0]);
    return M[0][0]*d00 - M[0][1]*d01 + M[0][2]*d02 - M[0][3]*d03;
}

vec4 solveCramer4(mat4 M, vec4 f) {
    float det = det4(M);
    float invDet = 1.0 / det;
    mat4 M0 = M; M0[0][0] = f.x; M0[1][0] = f.y; M0[2][0] = f.z; M0[3][0] = f.w;
    mat4 M1 = M; M1[0][1] = f.x; M1[1][1] = f.y; M1[2][1] = f.z; M1[3][1] = f.w;
    mat4 M2m = M; M2m[0][2] = f.x; M2m[1][2] = f.y; M2m[2][2] = f.z; M2m[3][2] = f.w;
    mat4 M3 = M; M3[0][3] = f.x; M3[1][3] = f.y; M3[2][3] = f.z; M3[3][3] = f.w;
    return vec4(det4(M0), det4(M1), det4(M2m), det4(M3)) * invDet;
}

void systemDerivC(
    float theta1, float omega1, float r1, float rdot1,
    float theta2, float omega2, float r2, float rdot2,
    out vec4 da, out vec4 db
) {
    float l1 = L10 + r1;
    float l2 = L20 + r2;
    float delta = theta1 - theta2;
    float sinD = sin(delta);
    float cosD = cos(delta);
    float l1sq = l1 * l1;
    float l2sq = l2 * l2;
    float w1sq = omega1 * omega1;
    float w2sq = omega2 * omega2;

    mat4 M;
    M[0][0] = TOTAL_M * l1sq; M[0][1] = 0.0;               M[0][2] = M2 * l1 * l2 * cosD; M[0][3] = -M2 * l1 * sinD;
    M[1][0] = 0.0;            M[1][1] = TOTAL_M;            M[1][2] = M2 * l2 * sinD;      M[1][3] = M2 * cosD;
    M[2][0] = M2*l1*l2*cosD;  M[2][1] = M2 * l2 * sinD;    M[2][2] = M2 * l2sq;            M[2][3] = 0.0;
    M[3][0] = -M2 * l1*sinD;  M[3][1] = M2 * cosD;         M[3][2] = 0.0;                  M[3][3] = M2;

    vec4 f;
    f.x = -2.0 * TOTAL_M * l1 * rdot1 * omega1
          - 2.0 * M2 * l1 * rdot2 * omega2 * cosD
          - M2 * l1 * l2 * w2sq * sinD
          - TOTAL_M * G * l1 * sin(theta1);
    f.y = TOTAL_M * l1 * w1sq
          + M2 * l2 * w2sq * cosD
          - 2.0 * M2 * rdot2 * omega2 * sinD
          + TOTAL_M * G * cos(theta1)
          - u_k1 * r1;
    f.z = -2.0 * M2 * l2 * rdot1 * omega1 * cosD
          - 2.0 * M2 * l2 * rdot2 * omega2
          + M2 * l1 * l2 * w1sq * sinD
          - M2 * G * l2 * sin(theta2);
    f.w = 2.0 * M2 * rdot1 * omega1 * sinD
          + M2 * l1 * w1sq * cosD
          + M2 * l2 * w2sq
          + M2 * G * cos(theta2)
          - u_k2 * r2;

    vec4 accel = solveCramer4(M, f);
    da = vec4(omega1, accel.x, rdot1, accel.y);
    db = vec4(omega2, accel.z, rdot2, accel.w);
}

void elasticDeriv(int mode, vec4 sa, vec4 sb, out vec4 da, out vec4 db) {
    if (mode == 0) {
        systemDerivA(sa.x, sa.y, sa.z, sa.w, sb.x, sb.y, da, db);
    } else if (mode == 1) {
        systemDerivB(sa.x, sa.y, sb.x, sb.y, sb.z, sb.w, da, db);
    } else {
        systemDerivC(sa.x, sa.y, sa.z, sa.w, sb.x, sb.y, sb.z, sb.w, da, db);
    }
}

void elasticStep(vec4 sa, vec4 sb, out vec4 newSA, out vec4 newSB) {
    vec4 ca, cb;
    if (u_elasticMode == 0) {
        ca = sa;
        cb = vec4(sb.x, sb.y, 0.0, 0.0);
    } else if (u_elasticMode == 1) {
        ca = vec4(sa.x, sa.y, 0.0, 0.0);
        cb = vec4(sa.z, sa.w, sb.x, sb.y);
    } else {
        ca = sa;
        cb = sb;
    }

    float dt = u_dt;
    vec4 da1, db1, da2, db2, da3, db3, da4, db4;
    elasticDeriv(u_elasticMode, ca, cb, da1, db1);
    elasticDeriv(u_elasticMode, ca + 0.5*dt*da1, cb + 0.5*dt*db1, da2, db2);
    elasticDeriv(u_elasticMode, ca + 0.5*dt*da2, cb + 0.5*dt*db2, da3, db3);
    elasticDeriv(u_elasticMode, ca + dt*da3, cb + dt*db3, da4, db4);

    vec4 newCA = ca + (dt / 6.0) * (da1 + 2.0*da2 + 2.0*da3 + da4);
    vec4 newCB = cb + (dt / 6.0) * (db1 + 2.0*db2 + 2.0*db3 + db4);

    if (u_elasticMode == 0) {
        newSA = newCA;
        newSB = vec4(newCB.x, newCB.y, 0.0, 1.0);
    } else if (u_elasticMode == 1) {
        newSA = vec4(newCA.x, newCA.y, newCB.x, newCB.y);
        newSB = vec4(newCB.z, newCB.w, 0.0, 1.0);
    } else {
        newSA = newCA;
        newSB = newCB;
    }
}

float circularDiff(float a, float b) {
    float d = a - b;
    return d - 2.0 * PI * floor(d / (2.0 * PI) + 0.5);
}

float measureElasticDivergence(vec4 bA, vec4 bB, vec4 pA, vec4 pB) {
    float d_t1 = circularDiff(bA.x, pA.x);
    float d_o1 = bA.y - pA.y;
    float dist_sq = d_t1 * d_t1 + d_o1 * d_o1;

    if (u_elasticMode == 0) {
        float d_t2 = circularDiff(bB.x, pB.x);
        float d_o2 = bB.y - pB.y;
        float d_r1 = bA.z - pA.z;
        float d_rd1 = bA.w - pA.w;
        dist_sq += d_t2*d_t2 + d_o2*d_o2 + d_r1*d_r1 + d_rd1*d_rd1;
    } else if (u_elasticMode == 1) {
        float d_t2 = circularDiff(bA.z, pA.z);
        float d_o2 = bA.w - pA.w;
        float d_r2 = bB.x - pB.x;
        float d_rd2 = bB.y - pB.y;
        dist_sq += d_t2*d_t2 + d_o2*d_o2 + d_r2*d_r2 + d_rd2*d_rd2;
    } else {
        float d_t2 = circularDiff(bB.x, pB.x);
        float d_o2 = bB.y - pB.y;
        float d_r1 = bA.z - pA.z;
        float d_rd1 = bA.w - pA.w;
        float d_r2 = bB.z - pB.z;
        float d_rd2 = bB.w - pB.w;
        dist_sq += d_t2*d_t2 + d_o2*d_o2 + d_r1*d_r1 + d_rd1*d_rd1 + d_r2*d_r2 + d_rd2*d_rd2;
    }

    return sqrt(dist_sq);
}

void main() {
    vec4 bA = texture(u_baseTextureA, v_uv);
    vec4 bB = texture(u_baseTextureB, v_uv);
    vec4 pA = texture(u_pertTextureA, v_uv);
    vec4 pB = texture(u_pertTextureB, v_uv);
    vec4 div = texture(u_divergenceTexture, v_uv);

    float iter = div.r;
    float hasDiv = div.g;

    vec4 newBA, newBB, newPA, newPB;
    elasticStep(bA, bB, newBA, newBB);
    elasticStep(pA, pB, newPA, newPB);

    if (hasDiv < 0.5) {
        float dist = measureElasticDivergence(newBA, newBB, newPA, newPB);
        if (dist > u_threshold) {
            iter = float(u_currentIter);
            hasDiv = 1.0;
        }
    }

    outBaseA = newBA;
    outBaseB = newBB;
    outPertA = newPA;
    outPertB = newPB;
    divergenceData = vec4(iter, hasDiv, 0.0, 1.0);
}
`;class J{constructor(t,e){n(this,"gl");n(this,"config");n(this,"programs",{});n(this,"quadBuffer");n(this,"textures");n(this,"framebuffers");n(this,"uniforms");n(this,"vaos");n(this,"rigidSim");n(this,"elasticSim");n(this,"divergenceSim");n(this,"elasticDivergenceSim");n(this,"renderer");n(this,"zoomController");n(this,"ui");n(this,"stats");n(this,"_preview");n(this,"canvas");n(this,"frameCount",0);n(this,"isDragging",!1);n(this,"dragStart",null);n(this,"dragCurrent",null);this.canvas=t,this.config={...e};const s=t.getContext("webgl2",{antialias:!1,preserveDrawingBuffer:!0});if(!s)throw new Error("WebGL 2.0 not supported");this.gl=s,s.getExtension("EXT_color_buffer_float"),this.quadBuffer=new E(s),this.textures=new y(s),this.framebuffers=new w(s),this.uniforms=new L(s),this.vaos=new D(s,this.quadBuffer.buffer),this.createPrograms();for(const[a,i]of Object.entries(this.programs))this.vaos.createVAOForProgram(i);this.renderer=new O(s,this.config,this.textures,this.uniforms,this.programs),this.rigidSim=new R(s,this.config,this.textures,this.framebuffers,this.uniforms,this.programs),this.elasticSim=new B(s,this.config,this.textures,this.framebuffers,this.uniforms,this.programs),this.divergenceSim=new I(s,this.config,this.textures,this.framebuffers,this.uniforms,this.programs,()=>this.onDivergenceComplete()),this.elasticDivergenceSim=new S(s,this.config,this.textures,this.framebuffers,this.uniforms,this.programs,()=>this.onDivergenceComplete()),this.zoomController=new p(this.config,()=>this.onZoomChange()),this.ui=new q,this.stats=new N,this._preview=new V(document.getElementById("canvasWrapper"),t,this.config),this.setupControls(),this.setupZoomControls(),this.reset(),this.animate()}createPrograms(){const t=new C(this.gl),e={init:k,physics:G,distance:U,initDivergence:$,divergence:Z,render:X,initElastic:W,physicsElastic:Y,distanceElastic:j,initElasticDivergence:K,divergenceElastic:Q};for(const[s,a]of Object.entries(e)){const i=s,r=t.linkProgram(H,a,i),o=this.vaos.createVAOForProgram(r);this.programs[i]={...r,vao:o}}}setupControls(){this.ui.bindControl("systemType",t=>{this.config.system=t,this.ui.updateModeUI(this.config),this.reset()}),this.ui.bindControl("vizMode",t=>{this.config.vizMode=t,this.ui.updateModeUI(this.config),this.reset()}),this.ui.bindControl("resolution",t=>{this.config.resolution=parseInt(t),this.canvas.width=this.config.resolution,this.canvas.height=this.config.resolution,this.reset()},"change"),["theta1Min","theta1Max","theta2Min","theta2Max"].forEach(t=>{this.ui.bindControl(t,e=>{const s=parseFloat(e);t==="theta1Min"?this.config.theta1Range.min=s:t==="theta1Max"?this.config.theta1Range.max=s:t==="theta2Min"?this.config.theta2Range.min=s:t==="theta2Max"&&(this.config.theta2Range.max=s),this.zoomController=new p(this.config,()=>this.onZoomChange()),this.reset()},"change")}),this.ui.bindControl("omega1",t=>{this.config.omega1=parseFloat(t),this.ui.setTextContent("omega1Value",this.config.omega1.toFixed(1)),this.reset()}),this.ui.bindControl("omega2",t=>{this.config.omega2=parseFloat(t),this.ui.setTextContent("omega2Value",this.config.omega2.toFixed(1)),this.reset()}),this.ui.bindControl("dt",t=>{this.config.dt=parseFloat(t),this.ui.setTextContent("dtValue",this.config.dt.toFixed(3))}),this.ui.bindControl("iterations",t=>{this.config.iterationsPerFrame=parseInt(t),this.ui.setTextContent("iterValue",String(this.config.iterationsPerFrame))}),this.ui.bindControl("maxIter",t=>{this.config.maxIter=parseInt(t),this.reset()},"change"),this.ui.bindControl("dtDiv",t=>{this.config.dt=parseFloat(t),this.ui.setTextContent("dtDivValue",this.config.dt.toFixed(3)),this.reset()}),this.ui.bindControl("threshold",t=>{this.config.threshold=parseFloat(t),this.ui.setTextContent("thresholdValue",this.config.threshold.toFixed(2)),this.reset()}),this.ui.bindControl("perturb",t=>{this.config.perturb=parseFloat(t),this.ui.setTextContent("perturbValue",this.config.perturb.toFixed(6)),this.reset()}),this.ui.bindControl("colormap",t=>{this.config.colormap=parseInt(t),this.ui.updateLegend(this.config.colormap)},"change"),this.ui.bindControl("toneMapping",t=>{this.config.toneMapping=parseInt(t)},"change"),this.ui.bindButton("resetBtn",()=>{this.zoomController.reset(),this.ui.updateRangeInputs(this.config),this.reset()}),this.ui.bindButton("downloadBtn",()=>this.download()),this.ui.bindControl("k1",t=>{this.config.k1=parseFloat(t),this.ui.setTextContent("k1Value",String(this.config.k1)),this.reset()}),this.ui.bindControl("k2",t=>{this.config.k2=parseFloat(t),this.ui.setTextContent("k2Value",String(this.config.k2)),this.reset()}),this.ui.updateModeUI(this.config),this.ui.updateLegend(this.config.colormap)}setupZoomControls(){const t=document.getElementById("zoomOverlay");this.canvas.addEventListener("mousedown",e=>{if(e.button!==0)return;const s=this.canvas.getBoundingClientRect(),a=(e.clientX-s.left)*(this.canvas.width/s.width),i=(e.clientY-s.top)*(this.canvas.height/s.height);this.isDragging=!0,this.dragStart={x:a,y:i},this.dragCurrent={x:a,y:i}}),this.canvas.addEventListener("mousemove",e=>{if(!this.isDragging)return;const s=this.canvas.getBoundingClientRect();this.dragCurrent={x:(e.clientX-s.left)*(this.canvas.width/s.width),y:(e.clientY-s.top)*(this.canvas.height/s.height)},this.updateZoomOverlay()}),this.canvas.addEventListener("mouseup",e=>{if(!this.isDragging)return;Math.sqrt((this.dragCurrent.x-this.dragStart.x)**2+(this.dragCurrent.y-this.dragStart.y)**2)>5&&this.zoomController.applyRectangle(this.dragStart.x,this.dragStart.y,this.dragCurrent.x,this.dragCurrent.y,this.canvas.width,this.canvas.height),this.isDragging=!1,this.dragStart=null,this.dragCurrent=null,t.style.display="none"}),this.canvas.addEventListener("mouseleave",()=>{this.isDragging=!1,this.dragStart=null,this.dragCurrent=null,t.style.display="none"}),this.canvas.addEventListener("contextmenu",e=>{e.preventDefault(),this.zoomController.zoomOut()}),this.ui.bindButton("zoomOutBtn",()=>this.zoomController.zoomOut())}updateZoomOverlay(){const t=document.getElementById("zoomOverlay"),e=document.getElementById("canvasWrapper");this.canvas.getBoundingClientRect();const s=e.getBoundingClientRect(),a=s.width/this.canvas.width,i=s.height/this.canvas.height,r=Math.min(this.dragStart.x,this.dragCurrent.x)*a,o=Math.min(this.dragStart.y,this.dragCurrent.y)*i,h=Math.max(this.dragStart.x,this.dragCurrent.x)*a,u=Math.max(this.dragStart.y,this.dragCurrent.y)*i;t.style.display="block",t.style.left=r+"px",t.style.top=o+"px",t.style.width=h-r+"px",t.style.height=u-o+"px"}onZoomChange(){this.ui.updateRangeInputs(this.config),this.reset()}onDivergenceComplete(){this.renderer.computeMaxValue(this.getCurrentDataTexture())}getCurrentDataTexture(){return this.config.vizMode==="divergence"?this.config.system==="rigid"?this.divergenceSim.getCurrentDataTexture():this.elasticDivergenceSim.getCurrentDataTexture():this.config.system==="rigid"?this.rigidSim.getCurrentDataTexture():this.elasticSim.getCurrentDataTexture()}getCurrentFrameCount(){return this.config.vizMode==="divergence"?this.config.system==="rigid"?this.divergenceSim.getFrameCount():this.elasticDivergenceSim.getFrameCount():this.frameCount}reset(){this.frameCount=0,this.divergenceSim.stop(),this.elasticDivergenceSim.stop(),this.config.system==="rigid"&&this.config.vizMode==="distance"?this.rigidSim.reset():this.config.system==="rigid"&&this.config.vizMode==="divergence"?this.divergenceSim.start():this.config.system!=="rigid"&&this.config.vizMode==="divergence"?this.elasticDivergenceSim.start():this.elasticSim.reset()}step(){this.config.vizMode!=="divergence"&&(this.config.system==="rigid"?this.rigidSim.step():this.elasticSim.step(),this.frameCount+=this.config.iterationsPerFrame)}render(){const t=this.getCurrentDataTexture();this.config.vizMode!=="divergence"&&this.renderer.computeMaxValue(t),this.renderer.render(t)}updateStats(){const t=this.config.vizMode==="divergence"&&this.getCurrentFrameCount()>=this.config.maxIter;this.stats.update(this.config,this.getCurrentFrameCount(),this.renderer.getMaxValue(),t),this.ui.updateStats(this.getCurrentFrameCount(),this.renderer.getMaxValue(),this.stats.getFps(),this.zoomController.level)}animate(){this.step(),(this.config.vizMode!=="divergence"||this.getCurrentFrameCount()<this.config.maxIter)&&this.render(),this.updateStats(),requestAnimationFrame(()=>this.animate())}download(){const t=document.createElement("a");t.download=`chaos-${this.config.system}-${this.config.vizMode}-frame${this.frameCount}.png`,t.href=this.canvas.toDataURL("image/png"),t.click()}}const _=document.getElementById("canvas");if(!_)throw new Error("Canvas not found");new J(_,P);

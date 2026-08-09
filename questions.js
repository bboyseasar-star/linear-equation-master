export const COURSE_ID = 'linear-equation';
export const RNG_VERSION = 'mulberry32-v1';
export const RETENTION_REQUIRED_GROUPS = ['eq1.both', 'eq1.paren', 'eq1.fraction'];

export function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; }
export class Rational {
  constructor(n, d = 1) { if (!Number.isInteger(n) || !Number.isInteger(d) || d === 0) throw new Error('invalid rational'); const sign = d < 0 ? -1 : 1; const g = gcd(n, d); this.n = sign * n / g; this.d = Math.abs(d) / g; Object.freeze(this); }
  add(o) { o = asR(o); return new Rational(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { o = asR(o); return new Rational(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { o = asR(o); return new Rational(this.n * o.n, this.d * o.d); }
  div(o) { o = asR(o); if (!o.n) throw new Error('divide zero'); return new Rational(this.n * o.d, this.d * o.n); }
  neg() { return new Rational(-this.n, this.d); }
  equals(o) { o = asR(o); return this.n === o.n && this.d === o.d; }
}
const asR = x => x instanceof Rational ? x : new Rational(x);
const R = (n,d=1) => new Rational(n,d);
export const fnv1a = text => { let h = 0x811c9dc5; for (const c of String(text)) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193); } return h >>> 0; };
export const mulberry32 = seed => () => { let t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const signed = (rng, values) => pick(rng, values) * (rng() < .5 ? -1 : 1);
const nonIntegerFraction = (rng, denominators) => { let value; do { value=R(signed(rng,[1,2,3,4]), pick(rng,denominators)); } while(value.d===1); return value; };
const compact = r => r.d === 1 ? String(r.n) : `${r.n < 0 ? '-' : ''}\\frac{${Math.abs(r.n)}}{${r.d}}`;
const decimalText = r => String(r.n / r.d);
const displayNumber = (r, decimal=false) => decimal && 100 % r.d === 0 ? decimalText(r) : compact(r);
const showTerm = (a, variable = 'x', decimal = false) => a.equals(R(1)) ? variable : a.equals(R(-1)) ? `-${variable}` : `${displayNumber(a,decimal)}${variable}`;
const equationLatex = ({ left, right }) => `${linearLatex(left)}=${linearLatex(right)}`;
function linearLatex({ a, b, paren, decimal }) {
  if (paren) { const p = paren.p >= 0 ? `+${paren.p}` : String(paren.p); const base = `${showTerm(a,'x',decimal)}(${paren.variable || 'x'}${p})`; return b.n ? `${base}${b.n >= 0 ? '+' : ''}${displayNumber(b,decimal)}` : base; }
  if (!a.n) return displayNumber(b,decimal);
  const core = showTerm(a,'x',decimal); return b.n ? `${core}${b.n >= 0 ? '+' : ''}${displayNumber(b,decimal)}` : core;
}
const canonical = value => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
};

const BLUEPRINT = [
  ['eq1-basic-direct','eq1.basic',1], ['eq1-both-basic','eq1.both',1], ['eq1-paren-distribute','eq1.paren',2], ['eq1-decimal-clear','eq1.decimal',2],
  ['eq1-fraction-clear','eq1.fraction',2], ['eq1-both-sign-shift','eq1.both',2], ['eq1-fraction-paren','eq1.fraction',3], ['eq1-transfer-combo','eq1.transfer',3]
];
// 1セット10問。3項の式を3問、4項の式を7問に固定する。
// 小数・分数係数や括弧を含む式は、このセットには含めない。
const SESSION_BLUEPRINT = [
  ['eq1-basic-direct', 0],
  ['eq1-basic-direct', 1],
  ['eq1-basic-direct', 2],
  ['eq1-both-basic', 0],
  ['eq1-both-basic', 1],
  ['eq1-both-basic', 2],
  ['eq1-both-basic', 3],
  ['eq1-both-sign-shift', 0],
  ['eq1-both-sign-shift', 1],
  ['eq1-both-sign-shift', 2]
];
export const getBlueprint = () => BLUEPRINT.map(([templateId, subskillTag, difficulty]) => ({ templateId, subskillTag, difficulty }));
export const deriveQuestionSeed = (sessionSeed, templateId, retryIndex = 0) => fnv1a(`${sessionSeed}|${COURSE_ID}|${templateId}|${retryIndex}`);

function baseQuestion({ templateId, subskillTag, difficulty, r, left, right, params, formPolicy, firstStep, hint1, misconceptionCodes }) {
  const solution = r;
  const equation = { left: { a:left.a, b:left.b, paren:left.paren || null, decimal:!!left.decimal }, right: { a:right.a, b:right.b, paren:right.paren || null, decimal:!!right.decimal } };
  const evalSide = (side, x) => side.a.mul((side.paren ? x.add(R(side.paren.p)) : x)).add(side.b);
  const normalize = side => ({ a:side.a, b:side.b.add(side.paren ? side.a.mul(R(side.paren.p)) : R(0)), decimal:!!side.decimal });
  const normalizedLeft = normalize(left), normalizedRight = normalize(right);
  const solved = normalizedLeft.a.sub(normalizedRight.a);
  if (!solved.n || !evalSide(left, solution).equals(evalSide(right, solution))) throw new Error('generation invariant failed');
  const answerSpec = { kind:'rational', canonicalValue:{ n:solution.n, d:solution.d }, formPolicy:{ allowedNumericForms:formPolicy, requireReducedFraction:formPolicy.includes('reducedFraction') && !formPolicy.includes('exactFiniteDecimal'), numericEquivalence:true }, allowedVariables:[], acceptedAliases:[] };
  const answerLatex = compact(solution);
  const difference = normalizedRight.b.sub(normalizedLeft.b);
  const arranged = `${showTerm(solved)}=${compact(difference)}`;
  const appendTerm = (base, term) => !term.n ? base : `${base}${term.n>0?'+':''}${showTerm(term)}`;
  const appendNumber = (base, value) => !value.n ? base : `${base}${value.n>0?'+':''}${compact(value)}`;
  const moveLeft = appendTerm(showTerm(normalizedLeft.a), normalizedRight.a.neg());
  const moveRight = appendNumber(compact(normalizedRight.b), normalizedLeft.b.neg());
  const transfer = `${moveLeft}=${moveRight}`;
  const normalizedEquation = equationLatex({left:normalizedLeft,right:normalizedRight});
  const hints=[{calc:equationLatex(equation),description:hint1}];
  if(left.paren || right.paren) hints.push({calc:normalizedEquation,description:'括弧を外して、同類項をまとめる。'});
  hints.push(
    {calc:transfer,description:'移項して、文字の項を左辺、数の項を右辺に集める。'},
    {calc:arranged,description:'左右それぞれの同類項を整理する。'},
    {calc:`\\frac{${showTerm(solved)}}{${compact(solved)}}=\\frac{${compact(difference)}}{${compact(solved)}}`,description:'両辺を x の係数で割る。'},
    {calc:`x=${answerLatex}`,description:'両辺を x の係数で割る。'}
  );
  return {
    templateId, courseId:COURSE_ID, subskillTag, difficulty, generatedParams:params, equation, fingerprint:`${templateId}|${params.seed}`,
    promptParts:[{type:'text', value:'次の方程式を解きなさい。'},{type:'math', value:equationLatex(equation)}], answerSpec, eligibleForD2Mix:true, evidenceYears:[], misconceptionCodes,
    hints,
    workedSolution:`\\(${equationLatex(equation)}\\) で、${firstStep}。移項して \\(${transfer}\\)、同類項を整理して \\(${arranged}\\) とします。両辺を \\(${compact(solved)}\\) で割ると \\(x=${answerLatex}\\)。代入すると左右はともに \\(${compact(evalSide(left,solution))}\\) です。`,
    generatorConstraints:{uniqueSolution:true, coefficientDifferenceNonZero:true, substituted:true}, provenance:'オリジナルの生成問題（過去問本文・固有数値は不使用）'
  };
}

export function createQuestion(templateId, sessionSeed, retryIndex = 0) {
  const rng = mulberry32(deriveQuestionSeed(sessionSeed, templateId, retryIndex));
  const rInt = R(signed(rng, [-4,-3,-2,-1,1,2,3,4].map(Math.abs)));
  let r, left, right, params, policy, first, h1, tag, difficulty;
  switch (templateId) {
    case 'eq1-basic-direct': { r=rInt; const a=R(signed(rng,[2,3,4,5])); let b=R(signed(rng,[1,2,3,4,5])); let target=a.mul(r).add(b); if(!target.n){b=b.add(R(7));target=a.mul(r).add(b);} left={a,b}; right={a:R(0),b:target}; tag='eq1.basic';difficulty=1;policy=['integer'];first='両辺から定数項を同じように移す';h1='文字を含む項を一方に残し、数の項を反対側へ整理しよう。'; break; }
    case 'eq1-both-basic': case 'eq1-both-sign-shift': { r=rInt; const a=R(signed(rng,[2,3,4,5])); let c=R(signed(rng,[1,2,3])); if(a.equals(c)) c=c.neg(); let b=R(signed(rng,[1,2,3,4])); let target=a.sub(c).mul(r).add(b); if(!target.n){b=b.add(R(7));target=a.sub(c).mul(r).add(b);} left={a,b}; right={a:c,b:target}; tag='eq1.both';difficulty=templateId.endsWith('shift')?2:1;policy=['integer'];first='両辺の文字を含む項を同じ側に集める';h1='両辺にある x の項を一方へ集める方針を立てよう。'; break; }
    case 'eq1-paren-distribute': { r=rInt; const a=R(signed(rng,[2,3,4])); const p=signed(rng,[1,2,3]); const b=R(signed(rng,[1,2,3])); left={a,b,paren:{p}}; right={a:R(0),b:a.mul(r.add(R(p))).add(b)}; tag='eq1.paren';difficulty=2;policy=['integer'];first='括弧の前の数を、括弧内のすべての項に分配する';h1='括弧の前の数が、括弧内のどの項にも掛かっているか確認しよう。'; break; }
    case 'eq1-decimal-clear': { r=nonIntegerFraction(rng,[2,5,10]); const a=R(signed(rng,[12,15,18]),10); const b=R(signed(rng,[1,2,3]),10); left={a,b,decimal:true}; right={a:R(0),b:a.mul(r).add(b),decimal:true}; tag='eq1.decimal';difficulty=2;policy=['exactFiniteDecimal'];first='両辺を10倍して小数点をなくす';h1='小数の式は、両辺を同じ数倍して整数の式にすると見通しがよくなる。'; break; }
    case 'eq1-fraction-clear': { r=nonIntegerFraction(rng,[2,3,4,5]); const a=R(signed(rng,[1,2,3]),pick(rng,[2,3,4])); const b=R(signed(rng,[1,2,3])); left={a,b}; right={a:R(0),b:a.mul(r).add(b)}; tag='eq1.fraction';difficulty=2;policy=['reducedFraction'];first='両辺に分母の最小公倍数を掛けて分数をなくす';h1='分数の分母に注目し、両辺全体に掛ける同じ数を考えよう。'; break; }
    case 'eq1-fraction-paren': { r=nonIntegerFraction(rng,[2,3,5]); const a=R(signed(rng,[1,2,3]),pick(rng,[2,3,4])); const p=signed(rng,[1,2]); const b=R(signed(rng,[1,2])); left={a,b,paren:{p}}; right={a:R(0),b:a.mul(r.add(R(p))).add(b)}; tag='eq1.fraction';difficulty=3;policy=['reducedFraction'];first='分母を払った後、括弧を外して整理する';h1='分数と括弧のどちらを先に処理すると計算しやすいか考えよう。'; break; }
    case 'eq1-transfer-combo': { r=nonIntegerFraction(rng,[2,3]); const a=R(signed(rng,[2,3,4])); let c=R(signed(rng,[1,2])); if(a.equals(c)) c=c.neg(); const p=signed(rng,[1,2]); const b=R(signed(rng,[1,2,3])); left={a,b,paren:{p}}; right={a:c,b:a.mul(r.add(R(p))).add(b).sub(c.mul(r))}; tag='eq1.transfer';difficulty=3;policy=['reducedFraction'];first='まず括弧を外し、両辺の x の項を一方に集める';h1='括弧を外したあと、どちらの辺に x の項を集めるか決めよう。'; break; }
    default: throw new Error(`unknown template: ${templateId}`);
  }
  params={ seed:deriveQuestionSeed(sessionSeed,templateId,retryIndex), r:{n:r.n,d:r.d}, leftA:{n:left.a.n,d:left.a.d}, leftB:{n:left.b.n,d:left.b.d}, rightA:{n:right.a.n,d:right.a.d}, rightB:{n:right.b.n,d:right.b.d}, leftParen:left.paren?.p ?? null };
  return baseQuestion({templateId,subskillTag:tag,difficulty,r,left,right,params,formPolicy:policy,firstStep:first,hint1:h1,misconceptionCodes:['EQ1-SIGN','EQ1-DIST','EQ1-FRAC','EQ1-DIV','EQ1-CALC']});
}
export function createSet(sessionSeed) { const seen=new Set(); return SESSION_BLUEPRINT.map(([id,retryIndex]) => { const q=createQuestion(id,sessionSeed,retryIndex); if(seen.has(q.fingerprint)) throw new Error('duplicate fingerprint'); seen.add(q.fingerprint); return q; }); }
export function canonicalQuestion(question) { return canonical({templateId:question.templateId, generatedParams:question.generatedParams, answer:question.answerSpec.canonicalValue, fingerprint:question.fingerprint}); }

function latexToText(input) { let s=String(input||'').replace(/\\left|\\right|\\,/g,'').replace(/−/g,'-'); let guard=0; while(/\\frac\{[^{}]*\}\{[^{}]*\}/.test(s) && guard++<12) s=s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g,'($1)/($2)'); return s.replace(/[{}]/g,'').replace(/\\times/g,'*').replace(/\\div/g,'/'); }
export function parseRational(input) {
  const raw=latexToText(input).replace(/\s+/g,''); if(!raw || raw.length>80 || !/^[0-9+\-*/().]+$/.test(raw)) return {ok:false, reason:'INVALID_FORMAT'};
  const tokens=raw.match(/\d+(?:\.\d+)?|[()+\-*/]/g); if(!tokens || tokens.join('')!==raw || tokens.length>60) return {ok:false,reason:'INVALID_FORMAT'}; let i=0;
  const decimal = /\d+\.\d+/.test(raw), fraction = raw.includes('/');
  const fractionSource = raw.replace(/[()]/g,'');
  const fractionParts = fractionSource.match(/^-?(\d+)\/(\d+)$/);
  const inputReduced = !fraction || Boolean(fractionParts && gcd(Number(fractionParts[1]), Number(fractionParts[2])) === 1);
  const number=()=>{ const t=tokens[i++]; if(!t || !/^\d/.test(t)) throw Error(); if(t.includes('.')) { const [a,b]=t.split('.'); return R(Number(a+b),10**b.length); } return R(Number(t)); };
  const factor=()=>{ if(tokens[i]==='+'){i++;return factor();} if(tokens[i]==='-'){i++;return factor().neg();} if(tokens[i]==='('){i++;const v=expr();if(tokens[i++]!==')')throw Error();return v;} return number(); };
  const term=()=>{let v=factor();while(tokens[i]==='*'||tokens[i]==='/'){const op=tokens[i++],w=factor();v=op==='*'?v.mul(w):v.div(w);}return v;};
  const expr=()=>{let v=term();while(tokens[i]==='+'||tokens[i]==='-'){const op=tokens[i++],w=term();v=op==='+'?v.add(w):v.sub(w);}return v;};
  try { const value=expr(); if(i!==tokens.length) throw Error(); return {ok:true,value,form: fraction?'reducedFraction':decimal?'exactFiniteDecimal':'integer', inputReduced, raw}; } catch { return {ok:false,reason:'INVALID_FORMAT'}; }
}
export function gradeAnswer(question, input) {
  const parsed=parseRational(input); if(!parsed.ok) return {correct:false,code:parsed.reason}; const answer=R(question.answerSpec.canonicalValue.n,question.answerSpec.canonicalValue.d); if(!parsed.value.equals(answer)) return {correct:false,code:diagnose(question,parsed.value)};
  const policy=question.answerSpec.formPolicy; const allowed=policy.allowedNumericForms.includes(parsed.form); const reduced=parsed.inputReduced;
  if(!allowed || (policy.requireReducedFraction && parsed.form!=='reducedFraction') || !reduced) return {correct:false,code:'NOT_SIMPLIFIED', equivalent:true};
  const x=parsed.value, l=question.equation.left.a.mul(question.equation.left.paren?x.add(R(question.equation.left.paren.p)):x).add(question.equation.left.b), rr=question.equation.right.a.mul(question.equation.right.paren?x.add(R(question.equation.right.paren.p)):x).add(question.equation.right.b);
  return l.equals(rr)?{correct:true,code:null}:{correct:false,code:'UNCLASSIFIED'};
}
function diagnose(question, value) { const r=R(question.answerSpec.canonicalValue.n,question.answerSpec.canonicalValue.d); if(value.equals(r.neg())) return 'EQ1-SIGN'; if(question.subskillTag==='eq1.paren' && value.equals(r.add(R(1)))) return 'EQ1-DIST'; if(question.subskillTag.includes('fraction') && value.equals(R(r.n,r.d+1))) return 'EQ1-FRAC'; if(value.equals(R(r.n))) return 'EQ1-DIV'; return 'UNCLASSIFIED'; }

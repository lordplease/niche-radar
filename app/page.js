"use client";
import { useState, useRef, useEffect } from "react";

const callClaude = async ({ system, messages, tools, max_tokens = 4000 }) => {
  const body = { model: "claude-sonnet-4-6", max_tokens, system, messages };
  if (tools) body.tools = tools;
  const res = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) { const e = await res.text(); console.error("API Error:", e); throw new Error("API call failed: " + e.substring(0, 200)); }
  return res.json();
};

const extractText = (data) => data.content?.filter(b => b.type === "text").map(b => b.text).join("\n") || "";

const SYS = `You are NicheRadar — an elite AI market intelligence engine for branded dropshipping. The user is UK-based, building branded dropshipping businesses (Shopify + CJDropshipping/AliExpress/1688). They target emotional niches with repeat-purchase potential, run Meta ads with UGC, target women 25-45, budget £1-3k, ship to UK. Only surface niches for branded dropshipping with realistic GBP unit economics. Prefer subscription/refill products, emotionally-charged niches, weak competitor branding. Filter out generic gadgets, oversaturated niches, regulated categories. For each niche respond in EXACT JSON (no markdown no backticks): {"niches":[{"name":"...","tagline":"...","heroProduct":"...","sourcing":{"platforms":["CJDropshipping","1688","AliExpress"],"searchTerms":["t1","t2"],"estimatedProductCostGBP":3.5,"estimatedShippingToUKGBP":2.8,"estimatedShippingDays":"10-18","moqForWhiteLabel":"50-100","whitelabelFeasibility":"Easy","packagingCustomisation":"..."},"unitEconomics":{"retailPriceGBP":22.99,"productCostGBP":3.5,"shippingToUKGBP":2.8,"totalCOGS":6.3,"shopifyTransactionFee":0.69,"paymentProcessingFee":0.77,"grossProfitPerUnit":15.23,"grossMarginPercent":66.2,"estimatedCPAatBreakeven":15.23,"targetCPA":7.62,"netProfitPerUnitAfterAds":7.61,"netMarginAfterAds":33.1,"breakEvenROAS":1.51,"targetROAS":3.02,"monthlyRevenueAt5OrdersPerDay":3448.5,"monthlyProfitAt5OrdersPerDay":1141.5,"subscriptionLTV12Months":275.88},"subscriptionAngle":"...","problem":"...","whyNow":"...","audience":"...","metaAdAngle":"...","emotionalDriver":"...","competitors":"...","brandingOpportunity":"...","contentFlywheel":"...","moat":"...","fastMVP":"...","longTermVision":"...","scores":{"demand":{"score":8,"reason":"..."},"competitionWeakness":{"score":7,"reason":"..."},"brandingPotential":{"score":9,"reason":"..."},"profitability":{"score":7,"reason":"..."},"virality":{"score":6,"reason":"..."},"retention":{"score":8,"reason":"..."},"scalability":{"score":7,"reason":"..."},"communityPotential":{"score":8,"reason":"..."},"seoOpportunity":{"score":6,"reason":"..."},"defensibility":{"score":7,"reason":"..."}},"launchChecklist":{"solvesRealProblem":{"pass":true,"reason":"..."},"profitMarginGreenZone":{"pass":true,"reason":"Must be >60% gross margin"},"lightweight":{"pass":true,"reason":"Under 500g, cheap to ship"},"upsellPotential":{"pass":true,"reason":"List 2-3 upsell products"},"notSeasonal":{"pass":true,"reason":"Year-round demand"},"validatedNotSaturated":{"pass":true,"reason":"Proven demand but fewer than 3 branded UK competitors"}},"brandIdeas":{"names":["N1","N2","N3"],"positioning":"...","visualDirection":"...","messagingStrategy":"...","contentPillars":["P1","P2","P3"]}}]} IMPORTANT: For launchChecklist, be BRUTALLY HONEST — if a criterion fails, set pass to false and explain why. Use real formulas for all numbers.`;

const SPRINT_SYS = `You are a live market research agent for UK branded dropshipping. You have web search access. Your mission: find REAL products trending RIGHT NOW with weak or zero UK branded competition.

RESEARCH PROCESS — do ALL of these searches:
1. Search for trending/viral products in the user's category. Try queries like "trending [category] products 2026 dropshipping", "viral tiktok products [category] 2026", "winning products [category] dropshipping", "CJDropshipping trending [category]"
2. For each promising product you find, search for UK branded competition. Try "[product name] UK shop", "[product name] UK brand", "site:trustpilot.com [product type] UK"
3. Check approximate sourcing prices — search CJDropshipping or AliExpress for the product
4. Do at least 6-8 different web searches total

CRITERIA — only include products where:
- Sourceable on CJ/AliExpress/1688 under £5-6 landed to UK
- Fewer than 3 branded UK Shopify/standalone stores selling it (Amazon sellers don't count as branded)
- NO regulatory compliance needed (no UKCA, CPSR, medical devices, supplements, skincare)
- Clear emotional or UGC content angle
- Not an oversaturated generic product every dropshipper already sells (no phone cases, pet beds, basic LED lights)

OUTPUT FORMAT — return your findings as detailed text. For each product opportunity include:
- Exact product name and description
- Where you found it trending
- Real prices you found (sourcing cost)
- UK competitors you found (or didn't find) with URLs if available
- Why the gap exists
- Suggested retail price and margin estimate
- UGC/Meta ad angle
- Risk factors
- Your confidence rating (1-10)

Be BRUTALLY HONEST. If you search and find strong UK competition, say so and skip it. If you can't find real pricing data, say so. Only recommend products backed by actual search results, not guesses.`;

const FORMAT_SYS = `You are a data formatter. Take the raw research findings and convert them into the exact JSON structure specified. Use the real data from the research — real prices, real competitor info, real scores based on what was actually found. Do NOT invent data that wasn't in the research. If data is missing, use conservative estimates and note it. Return ONLY valid JSON, no markdown, no backticks.`;

const SUP = `Supplier sourcing specialist. Search CJDropshipping, 1688, AliExpress. Return ONLY JSON: {"suppliers":[{"platform":"...","productName":"...","priceRangeGBP":"...","moq":"...","shippingToUKGBP":"...","shippingDays":"8-15","url":"...","whitelabelAvailable":true,"customPackaging":true,"rating":"4.7/5","notes":"..."}],"bestOption":{"platform":"...","reasoning":"..."}}`;
const CMP = `UK e-commerce competitive analyst. Return ONLY JSON: {"competitors":[{"name":"...","url":"...","platform":"...","priceRange":"...","brandQuality":"1-10 explanation","trustpilotRating":"...","socialMedia":{"instagram":"...","tiktok":"..."},"runningAds":"Yes/No","strengths":"...","weaknesses":"...","threatLevel":"Low/Medium/High"}],"marketGaps":"...","pricingInsight":"...","brandingInsight":"...","overallThreatAssessment":"1-10"}`;
const CATS = { open:"Discover the most promising branded dropshipping niches across ALL categories for UK.", pets:"Find underserved PET CARE niches for UK branded dropshipping.", beauty:"Find underserved BEAUTY niches for UK branded dropshipping.", home:"Find underserved HOME niches for UK branded dropshipping.", wellness:"Find underserved WELLNESS niches for UK branded dropshipping.", kids:"Find underserved KIDS niches for UK branded dropshipping.", sports:"Find underserved SPORTS & FITNESS niches for UK branded dropshipping.", fashion:"Find underserved FASHION & ACCESSORIES niches for UK branded dropshipping.", validate:"VALIDATION MODE. The user provides a specific product or niche below. Do NOT discover new niches — validate ONLY what the user specified. Deep validate: 1) DEMAND PROOF with market size, Google Trends direction, search volume indicators, seasonal patterns 2) COMPETITOR DEEP DIVE naming every UK brand selling this with pricing, Trustpilot scores, and weaknesses 3) SOURCING REALITY from CJ, 1688, AliExpress with real landed costs in GBP 4) FULL PnL at 3 price points: budget, mid, premium 5) CUSTOMER PAIN POINTS from real review themes 6) META AD angles with hook ideas and estimated CPA range 7) RISK FACTORS and barriers to entry 8) Final GO or NOGO verdict with confidence percentage. Be BRUTALLY HONEST — if it is a bad niche say so clearly. Still use the standard niche JSON format but with much deeper analysis in each field." };
const SPRINT_CATS = { open:"all categories — cast a wide net across home, wellness, beauty, fashion, fitness, hobby, lifestyle", pets:"pet care products", beauty:"beauty, skincare tools, hair accessories, makeup tools (NOT regulated skincare/cosmetics)", home:"home, kitchen, organisation, decor, cleaning", wellness:"wellness, fitness, self-care, recovery, mindfulness tools", kids:"kids, baby, parenting, nursery, toddler", sports:"sports, fitness, outdoor, gym, yoga, recovery", fashion:"fashion accessories, jewellery, bags, scarves, sunglasses, hats" };
const REGS = { global:"", uk:"Focus on UK market, GBP.", us:"Focus on US market, USD.", eu:"Focus on EU market." };
const SL = { demand:"Demand", competitionWeakness:"Weak Competition", brandingPotential:"Branding", profitability:"Profitability", virality:"Virality", retention:"Retention", scalability:"Scalability", communityPotential:"Community", seoOpportunity:"SEO", defensibility:"Defensibility" };
const SC = { demand:"#E8634A", competitionWeakness:"#D4A843", brandingPotential:"#7B68EE", profitability:"#2ECC71", virality:"#FF6B9D", retention:"#3498DB", scalability:"#1ABC9C", communityPotential:"#E67E22", seoOpportunity:"#9B59B6", defensibility:"#34495E" };
const M = "'IBM Plex Mono',monospace";
const F = "'IBM Plex Sans',sans-serif";
const G = "'Instrument Serif',serif";
const LB = { fontSize:9, fontWeight:700, color:"#64748B", letterSpacing:"0.12em", marginBottom:6, fontFamily:M };
const CD = { background:"#0F172A", borderRadius:10, padding:14, border:"1px solid #1E293B" };

function ScoreBar({label,score,reason,color}) {
  const [h,setH] = useState(false);
  return <div style={{marginBottom:6,position:"relative"}} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}>
    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:2,color:"#94A3B8",fontFamily:M}}><span>{label}</span><span style={{color,fontWeight:700}}>{score}/10</span></div>
    <div style={{height:6,background:"#1E293B",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${score*10}%`,background:color,borderRadius:3,transition:"width 0.8s ease"}}/></div>
    {h&&reason&&<div style={{position:"absolute",bottom:"100%",left:0,right:0,background:"#1E293B",border:"1px solid #334155",borderRadius:8,padding:"8px 10px",fontSize:11,color:"#CBD5E1",zIndex:10,marginBottom:4,lineHeight:1.4,boxShadow:"0 4px 20px rgba(0,0,0,0.4)"}}>{reason}</div>}
  </div>;
}

function PnL({ue}) {
  const [e,setE] = useState({...ue});
  const calc = (f,v) => { const n={...e,[f]:parseFloat(v)||0}; n.totalCOGS=+(n.productCostGBP+n.shippingToUKGBP).toFixed(2); n.shopifyTransactionFee=+(n.retailPriceGBP*0.03).toFixed(2); n.paymentProcessingFee=+(n.retailPriceGBP*0.029+0.10).toFixed(2); n.grossProfitPerUnit=+(n.retailPriceGBP-n.totalCOGS-n.shopifyTransactionFee-n.paymentProcessingFee).toFixed(2); n.grossMarginPercent=+((n.grossProfitPerUnit/n.retailPriceGBP)*100).toFixed(1); n.estimatedCPAatBreakeven=n.grossProfitPerUnit; n.targetCPA=+(n.grossProfitPerUnit*0.5).toFixed(2); n.netProfitPerUnitAfterAds=+(n.grossProfitPerUnit-n.targetCPA).toFixed(2); n.netMarginAfterAds=+((n.netProfitPerUnitAfterAds/n.retailPriceGBP)*100).toFixed(1); n.breakEvenROAS=n.estimatedCPAatBreakeven>0?+(n.retailPriceGBP/n.estimatedCPAatBreakeven).toFixed(2):0; n.targetROAS=n.targetCPA>0?+(n.retailPriceGBP/n.targetCPA).toFixed(2):0; n.monthlyRevenueAt5OrdersPerDay=+(n.retailPriceGBP*150).toFixed(2); n.monthlyProfitAt5OrdersPerDay=+(n.netProfitPerUnitAfterAds*150).toFixed(2); n.subscriptionLTV12Months=+(n.retailPriceGBP*12).toFixed(2); setE(n); };
  const inp = (l,f) => <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0"}}><span style={{fontSize:11,color:"#94A3B8",fontFamily:M}}>{l}</span><div style={{display:"flex",alignItems:"center",gap:2}}><span style={{fontSize:11,color:"#64748B",fontFamily:M}}>£</span><input type="number" step="0.01" value={e[f]} onChange={x=>calc(f,x.target.value)} style={{width:70,background:"#1E293B",border:"1px solid #334155",borderRadius:4,padding:"3px 6px",color:"#F1F5F9",fontSize:12,fontFamily:M,textAlign:"right"}}/></div></div>;
  const row = (l,v,c="#CBD5E1",p="£",s="") => <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0"}}><span style={{fontSize:11,color:"#94A3B8",fontFamily:M}}>{l}</span><span style={{fontSize:12,fontWeight:700,color:c,fontFamily:M}}>{p}{typeof v==="number"?v.toFixed(2):v}{s}</span></div>;
  const pc = e.netProfitPerUnitAfterAds>0?"#2ECC71":"#E8634A";
  return <div style={{...CD,border:"1px solid #2ECC7133"}}><div style={{...LB,color:"#2ECC71",marginBottom:12}}>P&L CALCULATOR</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}><div>{inp("Selling Price","retailPriceGBP")}{inp("Product Cost","productCostGBP")}{inp("Shipping","shippingToUKGBP")}<div style={{borderTop:"1px solid #1E293B",margin:"8px 0"}}/>{row("COGS",e.totalCOGS,"#E8634A")}{row("Shopify 3%",e.shopifyTransactionFee,"#94A3B8")}{row("Stripe",e.paymentProcessingFee,"#94A3B8")}</div><div>{row("Gross Profit",e.grossProfitPerUnit,"#2ECC71")}{row("Gross Margin",e.grossMarginPercent,e.grossMarginPercent>50?"#2ECC71":"#D4A843","","%")}<div style={{borderTop:"1px solid #1E293B",margin:"8px 0"}}/>{row("BE CPA",e.estimatedCPAatBreakeven,"#D4A843")}{row("Target CPA",e.targetCPA,"#3498DB")}{row("Net Profit",e.netProfitPerUnitAfterAds,pc)}{row("Net Margin",e.netMarginAfterAds,pc,"","%")}</div></div><div style={{borderTop:"1px solid #1E293B",margin:"12px 0"}}/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>{[{l:"BE ROAS",v:`${e.breakEvenROAS}x`,c:"#D4A843"},{l:"TARGET ROAS",v:`${e.targetROAS}x`,c:"#2ECC71"},{l:"MO REV",v:`£${e.monthlyRevenueAt5OrdersPerDay?.toFixed(0)}`,c:"#3498DB"},{l:"MO PROFIT",v:`£${e.monthlyProfitAt5OrdersPerDay?.toFixed(0)}`,c:pc}].map(i=><div key={i.l} style={{textAlign:"center"}}><div style={{fontSize:7.5,fontWeight:700,color:"#475569",letterSpacing:"0.1em",marginBottom:3,fontFamily:M}}>{i.l}</div><div style={{fontSize:16,fontWeight:700,color:i.c,fontFamily:M}}>{i.v}</div></div>)}</div>{e.subscriptionLTV12Months>0&&<div style={{marginTop:10,textAlign:"center",padding:"8px 0",background:"#7B68EE11",borderRadius:6,border:"1px solid #7B68EE22"}}><span style={{fontSize:9,color:"#7B68EE",fontFamily:M,fontWeight:700}}>12-MO LTV: </span><span style={{fontSize:18,fontWeight:700,color:"#B4A7FF",fontFamily:M}}>£{e.subscriptionLTV12Months?.toFixed(2)}</span></div>}</div>;
}

function Suppliers({niche}) {
  const [data,setData]=useState(null); const [ld,setLd]=useState(false); const [err,setErr]=useState(null);
  const go = async()=>{ setLd(true);setErr(null);try{ const t=niche.sourcing?.searchTerms?.join(", ")||niche.heroProduct; const d=await callClaude({system:SUP,messages:[{role:"user",content:`Find suppliers for: "${niche.heroProduct}". Search: ${t}. UK price: £${niche.unitEconomics?.retailPriceGBP||20}.`}]}); const tx=extractText(d); const m=tx.match(/\{[\s\S]*"suppliers"[\s\S]*\}/); if(m)setData(JSON.parse(m[0]));else setErr("Retry.");} catch(e){setErr("Failed.");} setLd(false);};
  return <div style={{...CD,border:"1px solid #E67E2233"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:data?12:0}}><div style={{...LB,color:"#E67E22",marginBottom:0}}>SUPPLIERS</div><button onClick={go} disabled={ld} style={{background:ld?"#1E293B":"#E67E2222",border:`1px solid ${ld?"#334155":"#E67E2244"}`,color:ld?"#64748B":"#E67E22",borderRadius:6,padding:"5px 12px",fontSize:10,fontWeight:700,cursor:ld?"wait":"pointer",fontFamily:M}}>{ld?"SEARCHING...":data?"REDO":"FIND"}</button></div>{err&&<div style={{marginTop:8,fontSize:11,color:"#E8634A",fontFamily:M}}>{err}</div>}{data&&<div>{data.suppliers?.map((s,i)=><div key={i} style={{background:"#0B1120",borderRadius:8,padding:12,marginBottom:8,border:"1px solid #1E293B"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><div><span style={{fontSize:9,fontWeight:700,color:s.platform==="CJDropshipping"?"#3498DB":"#D4A843",fontFamily:M}}>{s.platform}</span><div style={{fontSize:12,color:"#F1F5F9",fontWeight:600,marginTop:2}}>{s.productName}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:14,fontWeight:700,color:"#2ECC71",fontFamily:M}}>{s.priceRangeGBP}</div></div></div>{s.url&&s.url!=="N/A"&&<a href={s.url} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:"#3498DB",fontFamily:M,textDecoration:"none"}}>View</a>}</div>)}{data.bestOption&&<div style={{background:"#2ECC7111",borderRadius:8,padding:12,border:"1px solid #2ECC7122"}}><div style={{fontSize:12,color:"#CBD5E1",lineHeight:1.5}}>{data.bestOption.reasoning}</div></div>}</div>}</div>;
}

function Competitors({niche}) {
  const [data,setData]=useState(null); const [ld,setLd]=useState(false); const [err,setErr]=useState(null);
  const go = async()=>{ setLd(true);setErr(null);try{ const d=await callClaude({system:CMP,max_tokens:6000,messages:[{role:"user",content:`UK competitors for: ${niche.name}. Hero: ${niche.heroProduct}. Price: £${niche.unitEconomics?.retailPriceGBP||20}.`}]}); const tx=extractText(d); const m=tx.match(/\{[\s\S]*"competitors"[\s\S]*\}/); if(m)setData(JSON.parse(m[0]));else setErr("Retry.");} catch(e){setErr("Failed.");} setLd(false);};
  const tc = t=>t==="High"?"#E8634A":t==="Medium"?"#D4A843":"#2ECC71";
  return <div style={{...CD,border:"1px solid #E8634A33"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:data?12:0}}><div style={{...LB,color:"#E8634A",marginBottom:0}}>COMPETITORS</div><button onClick={go} disabled={ld} style={{background:ld?"#1E293B":"#E8634A22",border:`1px solid ${ld?"#334155":"#E8634A44"}`,color:ld?"#64748B":"#E8634A",borderRadius:6,padding:"5px 12px",fontSize:10,fontWeight:700,cursor:ld?"wait":"pointer",fontFamily:M}}>{ld?"CHECKING...":data?"REDO":"CHECK"}</button></div>{err&&<div style={{marginTop:8,fontSize:11,color:"#E8634A",fontFamily:M}}>{err}</div>}{data&&<div>{data.competitors?.map((c,i)=><div key={i} style={{background:"#0B1120",borderRadius:8,padding:12,marginBottom:8,border:"1px solid #1E293B"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div><div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><span style={{fontSize:14,fontWeight:700,color:"#F1F5F9"}}>{c.name}</span><span style={{fontSize:9,fontWeight:700,color:tc(c.threatLevel),background:`${tc(c.threatLevel)}15`,padding:"1px 6px",borderRadius:3,fontFamily:M}}>{c.threatLevel}</span></div><div style={{fontSize:11,color:"#94A3B8",fontFamily:M,marginTop:2}}>{c.priceRange}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:18,fontWeight:700,color:parseInt(c.brandQuality)>=7?"#E8634A":"#2ECC71",fontFamily:M}}>{c.brandQuality?.toString().match(/\d+/)?.[0]||"?"}<span style={{fontSize:10,color:"#64748B"}}>/10</span></div></div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><div><div style={{fontSize:8,color:"#2ECC71",fontWeight:700,fontFamily:M}}>STRENGTHS</div><div style={{fontSize:11,color:"#94A3B8",lineHeight:1.4}}>{c.strengths}</div></div><div><div style={{fontSize:8,color:"#E8634A",fontWeight:700,fontFamily:M}}>WEAKNESSES</div><div style={{fontSize:11,color:"#94A3B8",lineHeight:1.4}}>{c.weaknesses}</div></div></div>{c.url&&<a href={c.url} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:"#3498DB",fontFamily:M,textDecoration:"none",marginTop:6,display:"inline-block"}}>Visit</a>}</div>)}{data.marketGaps&&<div style={{background:"#2ECC7108",borderRadius:8,padding:10,border:"1px solid #2ECC7122",marginTop:8}}><div style={{fontSize:8,fontWeight:700,color:"#2ECC71",fontFamily:M,marginBottom:4}}>MARKET GAPS</div><div style={{fontSize:11,color:"#CBD5E1",lineHeight:1.4}}>{data.marketGaps}</div></div>}</div>}</div>;
}

function Info({label,value,icon}){return <div style={CD}><div style={LB}>{icon} {label}</div><div style={{fontSize:12.5,color:"#CBD5E1",lineHeight:1.5,fontFamily:F}}>{value}</div></div>;}

const CL_LABELS={solvesRealProblem:"Solves Real Problem",profitMarginGreenZone:"Margin >60%",lightweight:"Lightweight",upsellPotential:"Upsell Potential",notSeasonal:"Not Seasonal",validatedNotSaturated:"Validated, Not Saturated"};
function LaunchChecklist({checklist}){
  if(!checklist)return null;
  const entries=Object.entries(checklist);
  const passed=entries.filter(([,v])=>v?.pass).length;
  const total=entries.length;
  const allPass=passed===total;
  const color=allPass?"#2ECC71":passed>=5?"#D4A843":"#E8634A";
  const verdict=allPass?"LAUNCH READY":passed>=5?"CLOSE — FIX "+entries.filter(([,v])=>!v?.pass).map(([k])=>CL_LABELS[k]||k).join(", "):"NOT READY";
  return <div style={{...CD,border:`1px solid ${color}33`,marginBottom:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <div style={LB}>LAUNCH CHECKLIST</div>
      <div style={{fontSize:11,fontWeight:700,color,fontFamily:M,background:`${color}15`,padding:"3px 10px",borderRadius:4,border:`1px solid ${color}33`}}>{passed}/{total} — {verdict}</div>
    </div>
    {entries.map(([k,v])=><div key={k} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"5px 0",borderBottom:"1px solid #1E293B"}}>
      <span style={{fontSize:14,flexShrink:0,marginTop:1}}>{v?.pass?"✅":"❌"}</span>
      <div style={{flex:1}}>
        <div style={{fontSize:12,fontWeight:600,color:v?.pass?"#2ECC71":"#E8634A",fontFamily:M}}>{CL_LABELS[k]||k}</div>
        <div style={{fontSize:11,color:"#94A3B8",lineHeight:1.4,marginTop:2}}>{v?.reason||""}</div>
      </div>
    </div>)}
  </div>;
}

function Card({niche,index,expanded,onToggle,isSprint}) {
  const sc=niche.scores||{}; const tot=Object.values(sc).reduce((a,b)=>a+(b?.score||0),0); const avg=(tot/Math.max(Object.keys(sc).length,1)).toFixed(1);
  const tc=avg>=8?"#2ECC71":avg>=6.5?"#D4A843":"#E8634A"; const tl=avg>=8?"A-TIER":avg>=6.5?"B-TIER":"C-TIER"; const ue=niche.unitEconomics||{};
  const cl=niche.launchChecklist||{}; const clEntries=Object.entries(cl); const clPassed=clEntries.filter(([,v])=>v?.pass).length; const clTotal=clEntries.length||6; const clColor=clPassed===clTotal?"#2ECC71":clPassed>=5?"#D4A843":"#E8634A";
  return <div style={{background:"linear-gradient(135deg,#0F172A,#1E293B)",border:expanded?`1px solid ${isSprint?"#2ECC7144":"#7B68EE44"}`:"1px solid #1E293B",borderRadius:16,overflow:"hidden",transition:"all .3s",boxShadow:expanded?`0 8px 32px rgba(${isSprint?"52,211,153":"123,104,238"},.15)`:"none",marginBottom:10}}>
    <div onClick={onToggle} style={{padding:"20px 24px",cursor:"pointer",display:"flex",alignItems:"center",gap:16}}>
      <div style={{width:40,height:40,borderRadius:10,background:`linear-gradient(135deg,${tc}22,${tc}44)`,border:`1px solid ${tc}44`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:M,fontWeight:700,fontSize:14,color:tc,flexShrink:0}}>#{index+1}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><h3 style={{margin:0,fontSize:17,fontWeight:700,color:"#F1F5F9",fontFamily:G}}>{niche.name}</h3>{isSprint&&<span style={{fontSize:9,fontWeight:700,color:"#2ECC71",background:"#2ECC7115",border:"1px solid #2ECC7133",padding:"2px 8px",borderRadius:4,fontFamily:M}}>LIVE DATA</span>}<span style={{fontSize:9,fontWeight:700,color:tc,background:`${tc}15`,border:`1px solid ${tc}33`,padding:"2px 8px",borderRadius:4,fontFamily:M}}>{tl} — {avg}</span>{ue.retailPriceGBP&&<span style={{fontSize:9,fontWeight:700,color:"#2ECC71",background:"#2ECC7115",border:"1px solid #2ECC7133",padding:"2px 8px",borderRadius:4,fontFamily:M}}>£{ue.retailPriceGBP} · {ue.grossMarginPercent}%</span>}{clTotal>0&&<span style={{fontSize:9,fontWeight:700,color:clColor,background:`${clColor}15`,border:`1px solid ${clColor}33`,padding:"2px 8px",borderRadius:4,fontFamily:M}}>{clPassed}/{clTotal} LAUNCH</span>}</div>
        <p style={{margin:"4px 0 0",fontSize:13,color:"#94A3B8",fontFamily:F}}>{niche.tagline}</p>
        {niche.heroProduct&&<p style={{margin:"2px 0 0",fontSize:11,color:"#64748B",fontFamily:M}}>Hero: {niche.heroProduct}</p>}
      </div>
      <div style={{fontSize:18,color:"#64748B",transition:"transform .3s",transform:expanded?"rotate(180deg)":"rotate(0deg)"}}>▾</div>
    </div>
    {expanded&&<div style={{padding:"0 24px 24px"}}>
      {ue.retailPriceGBP&&<div style={{marginBottom:16}}><PnL ue={ue}/></div>}
      <LaunchChecklist checklist={niche.launchChecklist}/>
      <div style={{marginBottom:16}}><Suppliers niche={niche}/></div>
      <div style={{marginBottom:16}}><Competitors niche={niche}/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}><Info label="SUBSCRIPTION" value={niche.subscriptionAngle} icon=""/><Info label="META AD HOOK" value={niche.metaAdAngle} icon=""/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}><Info label="PROBLEM" value={niche.problem} icon=""/><Info label="WHY NOW" value={niche.whyNow} icon=""/><Info label="AUDIENCE" value={niche.audience} icon=""/><Info label="EMOTION" value={niche.emotionalDriver} icon=""/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}><Info label="COMPETITORS" value={niche.competitors} icon=""/><Info label="BRANDING" value={niche.brandingOpportunity} icon=""/><Info label="CONTENT" value={niche.contentFlywheel} icon=""/><Info label="MOAT" value={niche.moat} icon=""/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}><Info label="7-DAY MVP" value={niche.fastMVP} icon=""/><Info label="LONG-TERM" value={niche.longTermVision} icon=""/></div>
      <div style={{...CD,marginBottom:16}}><div style={{...LB,marginBottom:12}}>SCORES</div>{Object.entries(sc).map(([k,v])=><ScoreBar key={k} label={SL[k]||k} score={v?.score||0} reason={v?.reason} color={SC[k]||"#7B68EE"}/>)}</div>
      {niche.brandIdeas&&<div style={{background:"linear-gradient(135deg,#7B68EE11,#7B68EE08)",borderRadius:10,padding:16,border:"1px solid #7B68EE22"}}><div style={{...LB,color:"#7B68EE",marginBottom:12}}>BRAND BLUEPRINT</div><div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>{niche.brandIdeas.names?.map((n,i)=><span key={i} style={{background:"#7B68EE22",color:"#B4A7FF",padding:"4px 10px",borderRadius:6,fontSize:12,fontWeight:600,fontFamily:G,border:"1px solid #7B68EE33"}}>{n}</span>)}</div>{[{l:"Positioning",v:niche.brandIdeas.positioning},{l:"Visual",v:niche.brandIdeas.visualDirection},{l:"Messaging",v:niche.brandIdeas.messagingStrategy}].map(x=><div key={x.l} style={{marginBottom:8}}><span style={{fontSize:10,color:"#7B68EE",fontWeight:700,fontFamily:M}}>{x.l}: </span><span style={{fontSize:12,color:"#CBD5E1"}}>{x.v}</span></div>)}</div>}
    </div>}
  </div>;
}

export default function Home() {
  const [cat,setCat]=useState("open"); const [reg,setReg]=useState("uk"); const [cnt,setCnt]=useState(5); const [cp,setCp]=useState("");
  const [ld,setLd]=useState(false); const [niches,setNiches]=useState([]); const [exp,setExp]=useState(null); const [err,setErr]=useState(null); const [sc,setSc]=useState(false);
  const [valInput,setValInput]=useState("");
  const [mode,setMode]=useState("ai"); // "ai" or "sprint"
  const [sprintPhase,setSprintPhase]=useState(null); // null, "searching", "analyzing"
  const [sprintLog,setSprintLog]=useState([]);
  const [sprintRaw,setSprintRaw]=useState("");
  const [lastSprint,setLastSprint]=useState(false);
  const resultRef=useRef(null);

  useEffect(()=>{if(niches.length>0&&resultRef.current)resultRef.current.scrollIntoView({behavior:"smooth",block:"start"});},[niches]);

  // AI discovery mode (existing)
  const run = async()=>{
    if(cat==="validate"&&!valInput.trim()){setErr("Enter a product or niche to validate.");return;}
    setLd(true);setErr(null);setNiches([]);setExp(null);setLastSprint(false);
    try{
      let msg;
      if(cat==="validate"){
        msg=`${CATS.validate}\n\nProduct/niche to validate: "${valInput}"\n\n${REGS[reg]}${cp?"\n\nAdditional context: "+cp:""}\n\nGenerate exactly 1 niche entry for this validation. Return ONLY valid JSON.`;
      } else {
        msg=`${CATS[cat]}\n\n${REGS[reg]}${cp?"\n\nContext: "+cp:""}\n\nGenerate exactly ${cnt} niches. Return ONLY valid JSON.`;
      }
      const d=await callClaude({system:SYS,max_tokens:16000,messages:[{role:"user",content:msg}]});
      const tx=extractText(d);
      const p=JSON.parse(tx.replace(/```json|```/g,"").trim());
      if(p.niches){setNiches(p.niches.sort((a,b)=>{const av=n=>{const v=Object.values(n.scores||{});return v.reduce((s,x)=>s+(x?.score||0),0)/Math.max(v.length,1);};return av(b)-av(a);}));if(cat==="validate")setExp(0);} else setErr("Bad format.");
    } catch(e){console.error(e);setErr("Failed. Try again.");} setLd(false);
  };

  // Research Sprint mode (new — uses live web search)
  const runSprint = async()=>{
    setLd(true);setErr(null);setNiches([]);setExp(null);setSprintLog([]);setSprintRaw("");setLastSprint(true);
    const addLog=(msg)=>setSprintLog(prev=>[...prev,msg]);
    try{
      // Phase 1: Live web research
      setSprintPhase("searching");
      addLog("Starting live web research...");
      addLog(`Searching for trending ${SPRINT_CATS[cat]||cat} products...`);

      const research = await callClaude({
        system:SPRINT_SYS,
        messages:[{role:"user",content:`Run a research sprint for: ${SPRINT_CATS[cat]||cat}\n\nRegion: ${reg.toUpperCase()}\n${cp?"Additional filters: "+cp+"\n":""}Find 3-4 real product opportunities with weak UK branded competition. Do 5-6 web searches. Keep descriptions concise — product name, sourcing price, UK competitors found, gap assessment, confidence score. No essays.`}],
        tools:[{type:"web_search_20250305",name:"web_search"}],
        max_tokens:3000
      });

      const researchText = extractText(research);
      setSprintRaw(researchText);

      if(!researchText || researchText.length < 100){
        setErr("Web search returned insufficient data. Try again or try a different category.");
        setLd(false);setSprintPhase(null);return;
      }

      addLog("Research complete. Found product opportunities.");
      addLog("Waiting for rate limit cooldown...");

      // Wait 15 seconds to avoid rate limit between Phase 1 and Phase 2
      await new Promise(r => setTimeout(r, 15000));

      addLog("Formatting into structured analysis...");

      // Phase 2: Format research into niche JSON (truncate to avoid rate limit)
      const trimmed = researchText.length > 4000 ? researchText.substring(0, 4000) + "\n\n[TRUNCATED — use available data]" : researchText;
      setSprintPhase("analyzing");
      const formatted = await callClaude({
        system:`Format research into JSON. Return ONLY: {"niches":[...]} Each niche needs: name, tagline, heroProduct, sourcing (platforms, searchTerms, estimatedProductCostGBP, estimatedShippingToUKGBP, estimatedShippingDays, moqForWhiteLabel, whitelabelFeasibility, packagingCustomisation), unitEconomics (retailPriceGBP, productCostGBP, shippingToUKGBP, totalCOGS, shopifyTransactionFee=price*0.03, paymentProcessingFee=price*0.029+0.10, grossProfitPerUnit, grossMarginPercent, estimatedCPAatBreakeven=grossProfit, targetCPA=grossProfit*0.5, netProfitPerUnitAfterAds, netMarginAfterAds, breakEvenROAS, targetROAS, monthlyRevenueAt5OrdersPerDay=price*150, monthlyProfitAt5OrdersPerDay=netProfit*150, subscriptionLTV12Months=price*12), subscriptionAngle, problem, whyNow, audience, metaAdAngle, emotionalDriver, competitors, brandingOpportunity, contentFlywheel, moat, fastMVP, longTermVision, scores (demand, competitionWeakness, brandingPotential, profitability, virality, retention, scalability, communityPotential, seoOpportunity, defensibility — each {score:0-10,reason:"..."}), launchChecklist (solvesRealProblem, profitMarginGreenZone, lightweight, upsellPotential, notSeasonal, validatedNotSaturated — each {pass:bool,reason:"..."}), brandIdeas (names[3], positioning, visualDirection, messagingStrategy, contentPillars[3]). Use REAL data from research. No markdown. No backticks.`,
        max_tokens:8000,
        messages:[{role:"user",content:`Convert this research into niche JSON. Use real prices and competitor data found. Be strict on launchChecklist — fail criteria that aren't clearly met.\n\n${trimmed}`}]
      });

      const fmtText = extractText(formatted);
      const parsed = JSON.parse(fmtText.replace(/```json|```/g,"").trim());
      if(parsed.niches&&parsed.niches.length>0){
        setNiches(parsed.niches.sort((a,b)=>{const av=n=>{const v=Object.values(n.scores||{});return v.reduce((s,x)=>s+(x?.score||0),0)/Math.max(v.length,1);};return av(b)-av(a);}));
        addLog(`Done — ${parsed.niches.length} opportunities found from live data.`);
      } else {
        setErr("Could not format research data. Raw research saved below.");
      }
    } catch(e){
      console.error(e);
      setErr("Sprint failed: " + (e.message||"Unknown error").substring(0,150));
    }
    setLd(false);setSprintPhase(null);
  };

  const cats=[{k:"open",l:"All",i:"🌐"},{k:"beauty",l:"Beauty",i:"✨"},{k:"home",l:"Home",i:"🏠"},{k:"wellness",l:"Wellness",i:"🧘"},{k:"kids",l:"Kids",i:"👶"},{k:"sports",l:"Sports",i:"⛰️"},{k:"fashion",l:"Fashion",i:"👗"},{k:"validate",l:"Validate",i:"🔬"}];
  const regs=[{k:"uk",l:"UK"},{k:"us",l:"US"},{k:"eu",l:"EU"},{k:"global",l:"All"}];
  const pill=a=>({background:a?"#7B68EE22":"#1E293B",border:a?"1px solid #7B68EE55":"1px solid #334155",color:a?"#B4A7FF":"#94A3B8",borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer",fontWeight:600,fontFamily:F});
  const vpill=a=>({background:a?"#E8634A22":"#1E293B",border:a?"1px solid #E8634A55":"1px solid #334155",color:a?"#E8634A":"#94A3B8",borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer",fontWeight:600,fontFamily:F});
  const spill=a=>({background:a?"#7B68EE22":"#1E293B",border:a?"1px solid #7B68EE55":"1px solid #334155",color:a?"#B4A7FF":"#94A3B8",borderRadius:6,padding:"5px 10px",fontSize:11,cursor:"pointer",fontFamily:M,fontWeight:a?700:600,minWidth:32});

  return <div style={{minHeight:"100vh",background:"#0B1120",color:"#F1F5F9",fontFamily:F,padding:"32px 20px",maxWidth:860,margin:"0 auto"}}>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono:wght@400;500;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
    <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}@keyframes scanLine{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}::selection{background:#7B68EE44}textarea:focus,input:focus{outline:none}input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}`}</style>

    {/* Header */}
    <div style={{marginBottom:36,textAlign:"center"}}><div style={{display:"inline-flex",alignItems:"center",gap:10,marginBottom:8}}><div style={{width:10,height:10,borderRadius:"50%",background:ld?"#E8634A":"#2ECC71",boxShadow:ld?"0 0 12px #E8634A88":"0 0 12px #2ECC7188",animation:ld?"pulse 1.2s infinite":"none"}}/><h1 style={{margin:0,fontSize:32,fontWeight:400,fontFamily:G}}>NicheRadar</h1></div><p style={{margin:0,fontSize:13,color:"#64748B",fontFamily:M,letterSpacing:".05em"}}>NICHES + SUPPLIERS + COMPETITORS + P&L</p></div>

    {/* Mode toggle */}
    <div style={{display:"flex",justifyContent:"center",gap:4,marginBottom:20}}>
      <button onClick={()=>setMode("ai")} style={{background:mode==="ai"?"#7B68EE22":"#0F172A",border:mode==="ai"?"1px solid #7B68EE55":"1px solid #1E293B",color:mode==="ai"?"#B4A7FF":"#64748B",borderRadius:"8px 0 0 8px",padding:"10px 20px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:M}}>AI DISCOVERY</button>
      <button onClick={()=>setMode("sprint")} style={{background:mode==="sprint"?"#2ECC7122":"#0F172A",border:mode==="sprint"?"1px solid #2ECC7155":"1px solid #1E293B",color:mode==="sprint"?"#2ECC71":"#64748B",borderRadius:"0 8px 8px 0",padding:"10px 20px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:M}}>RESEARCH SPRINT</button>
    </div>

    {/* Sprint explainer */}
    {mode==="sprint"&&<div style={{background:"#2ECC7108",border:"1px solid #2ECC7122",borderRadius:10,padding:14,marginBottom:20,fontSize:12,color:"#94A3B8",lineHeight:1.6,fontFamily:F}}>
      <span style={{color:"#2ECC71",fontWeight:700,fontFamily:M,fontSize:10}}>LIVE RESEARCH </span>
      Searches the real web for trending products, checks UK competition, finds gaps. Uses live data, not AI guessing. Takes 30-60 seconds.
    </div>}

    {/* Controls panel */}
    <div style={{background:"#0F172A",border:"1px solid #1E293B",borderRadius:14,padding:20,marginBottom:24}}>
      <div style={LB}>CATEGORY</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
        {cats.filter(c=>mode==="sprint"?c.k!=="validate":true).map(c=><button key={c.k} style={c.k==="validate"?vpill(cat===c.k):pill(cat===c.k)} onClick={()=>setCat(c.k)}>{c.i} {c.l}</button>)}
      </div>

      {/* Validate input */}
      {cat==="validate"&&mode==="ai"&&<div style={{marginBottom:16}}>
        <div style={LB}>PRODUCT / NICHE TO VALIDATE</div>
        <div style={{display:"flex",gap:8}}>
          <input value={valInput} onChange={e=>setValInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&valInput.trim())run();}} placeholder="e.g. silicone dog paw cleaner, bamboo baby cutlery set..." style={{flex:1,background:"#1E293B",border:"1px solid #334155",borderRadius:8,padding:"10px 14px",color:"#F1F5F9",fontSize:13,fontFamily:F}}/>
        </div>
        <div style={{fontSize:10,color:"#475569",fontFamily:M,marginTop:6}}>Enter a specific product or niche — NicheRadar will give you a brutally honest GO/NOGO verdict</div>
      </div>}

      {/* Region + count */}
      {cat!=="validate"&&<div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:16}}>
        <div><div style={{...LB,marginBottom:6}}>REGION</div><div style={{display:"flex",gap:4}}>{regs.map(r=><button key={r.k} style={spill(reg===r.k)} onClick={()=>setReg(r.k)}>{r.l}</button>)}</div></div>
        {mode==="ai"&&<div><div style={{...LB,marginBottom:6}}>RESULTS</div><div style={{display:"flex",gap:4}}>{[3,5,7,10].map(n=><button key={n} style={spill(cnt===n)} onClick={()=>setCnt(n)}>{n}</button>)}</div></div>}
      </div>}

      {cat==="validate"&&<div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:16}}><div><div style={{...LB,marginBottom:6}}>REGION</div><div style={{display:"flex",gap:4}}>{regs.map(r=><button key={r.k} style={spill(reg===r.k)} onClick={()=>setReg(r.k)}>{r.l}</button>)}</div></div></div>}

      <button onClick={()=>setSc(!sc)} style={{background:"none",border:"none",color:"#64748B",fontSize:11,cursor:"pointer",fontFamily:M,padding:0,marginBottom:sc?8:0}}>{sc?"▾":"▸"} Custom filters</button>
      {sc&&<textarea value={cp} onChange={e=>setCp(e.target.value)} placeholder={mode==="sprint"?"e.g. consumables only, under £25 retail, exclude anything needing compliance":"e.g. consumables, under £25, female 28-45"} style={{width:"100%",background:"#1E293B",border:"1px solid #334155",borderRadius:8,padding:10,color:"#CBD5E1",fontSize:12,fontFamily:F,minHeight:60,resize:"vertical",boxSizing:"border-box"}}/>}
    </div>

    {/* Action button */}
    <button onClick={mode==="sprint"?runSprint:run} disabled={ld} style={{width:"100%",padding:"14px 24px",background:ld?"#1E293B":mode==="sprint"?"linear-gradient(135deg,#2ECC71,#1A9B5A)":cat==="validate"?"linear-gradient(135deg,#E8634A,#C0392B)":"linear-gradient(135deg,#7B68EE,#5B4FCF)",border:"none",borderRadius:10,color:ld?"#64748B":"#FFF",fontSize:14,fontWeight:700,fontFamily:M,letterSpacing:".08em",cursor:ld?"wait":"pointer",marginBottom:28,position:"relative",overflow:"hidden"}}>
      {ld&&<div style={{position:"absolute",top:0,left:0,right:0,bottom:0,overflow:"hidden"}}><div style={{height:"100%",width:"60%",background:`linear-gradient(90deg,transparent,${mode==="sprint"?"#2ECC7122":"#7B68EE22"},transparent)`,animation:"scanLine 1.5s infinite"}}/></div>}
      {ld?(sprintPhase==="searching"?"SEARCHING THE WEB...":sprintPhase==="analyzing"?"ANALYZING OPPORTUNITIES...":"SCANNING..."):mode==="sprint"?"RESEARCH SPRINT":cat==="validate"?"VALIDATE NICHE":"RUN NICHE SCAN"}
    </button>

    {/* Sprint progress log */}
    {sprintLog.length>0&&ld&&<div style={{background:"#0F172A",border:"1px solid #2ECC7122",borderRadius:10,padding:16,marginBottom:20}}>
      <div style={{...LB,color:"#2ECC71",marginBottom:10}}>SPRINT LOG</div>
      {sprintLog.map((msg,i)=><div key={i} style={{fontSize:11,color:i===sprintLog.length-1?"#2ECC71":"#64748B",fontFamily:M,padding:"3px 0",animation:"fadeIn 0.3s ease"}}>{i===sprintLog.length-1&&ld?"▸ ":""}{msg}</div>)}
    </div>}

    {/* Error */}
    {err&&<div style={{background:"#E8634A15",border:"1px solid #E8634A33",borderRadius:10,padding:14,marginBottom:20,fontSize:13,color:"#E8634A",fontFamily:M}}>{err}</div>}

    {/* Raw sprint data (if formatting failed) */}
    {err&&sprintRaw&&<div style={{background:"#0F172A",border:"1px solid #1E293B",borderRadius:10,padding:16,marginBottom:20}}>
      <div style={{...LB,marginBottom:10}}>RAW RESEARCH DATA</div>
      <div style={{fontSize:12,color:"#CBD5E1",lineHeight:1.6,fontFamily:F,whiteSpace:"pre-wrap"}}>{sprintRaw}</div>
    </div>}

    {/* Results */}
    {niches.length>0&&<div ref={resultRef}><div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
      <div style={LB}>{cat==="validate"?"VALIDATION RESULT":lastSprint?`${niches.length} LIVE OPPORTUNITIES`:`${niches.length} OPPORTUNITIES`}</div>
      {lastSprint&&<div style={{fontSize:10,color:"#2ECC71",fontFamily:M}}>from web research</div>}
      {!lastSprint&&<div style={{fontSize:10,color:"#334155",fontFamily:M}}>Click to expand</div>}
    </div>{niches.map((n,i)=><Card key={i} niche={n} index={i} expanded={exp===i} onToggle={()=>setExp(exp===i?null:i)} isSprint={lastSprint}/>)}</div>}

    {!ld&&niches.length===0&&!err&&<div style={{textAlign:"center",padding:"48px 20px",color:"#334155"}}><div style={{fontSize:48,marginBottom:12}}>{mode==="sprint"?"⚡":"◎"}</div><div style={{fontSize:13,fontFamily:M}}>{mode==="sprint"?"Select a category and hit RESEARCH SPRINT":"Select a category and hit RUN"}</div></div>}
  </div>;
}
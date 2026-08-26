import { Activity, ArrowRight, Check, CheckCircle2, RotateCcw, ShieldCheck, Terminal, X } from 'lucide-react'
import { useState } from 'react'

export function InteractiveWorkbench({ scenario, onPassed }) {
  const [phase,setPhase]=useState('idle')
  const [index,setIndex]=useState(0)
  const [answers,setAnswers]=useState([])
  if(!scenario)return null
  const current=scenario.nodes[index]
  const selected=answers[index]
  const answered=Number.isInteger(selected)
  const correct=answered&&selected===current.answer
  const score=Math.round(answers.filter((answer,nodeIndex)=>answer===scenario.nodes[nodeIndex].answer).length/scenario.nodes.length*100)
  const reset=()=>{setPhase('active');setIndex(0);setAnswers([])}
  const choose=choice=>{if(answered)return;setAnswers(existing=>{const next=[...existing];next[index]=choice;return next})}
  const advance=()=>{if(!answered)return;if(index<scenario.nodes.length-1){setIndex(value=>value+1);return}const finalScore=Math.round(answers.filter((answer,nodeIndex)=>answer===scenario.nodes[nodeIndex].answer).length/scenario.nodes.length*100);setPhase('complete');if(finalScore>=67)onPassed(finalScore)}

  if(phase==='idle')return <section className="interactive-workbench idle"><div className="workbench-radar"><Activity/><i/><i/></div><div><span>INTERACTIVE OPERATOR WORKBENCH</span><h2>{scenario.title}</h2><p>{scenario.brief}</p><div><em>{scenario.mode}</em><em>{scenario.nodes.length} DECISION NODES</em><em>67% PASS LINE</em></div></div><button onClick={reset}>Initialize scenario <ArrowRight/></button></section>

  if(phase==='complete'){
    const passed=score>=67
    return <section className={`interactive-workbench result ${passed?'passed':'failed'}`}><div className="result-seal">{passed?<ShieldCheck/>:<X/>}</div><span>{passed?'PRACTICAL MASTERY VERIFIED':'PRACTICAL BELOW STANDARD'}</span><h2>{score}%</h2><p>{passed?'The operator decision trail has been attached to this lesson attempt. Continue to the knowledge validation.':'Review the debrief and run the scenario again. Two of three decisions must be correct.'}</p><div className="signal-pack">{scenario.nodes.map((node,nodeIndex)=><div key={node.signal}><i className={answers[nodeIndex]===node.answer?'good':'bad'}/><span>NODE {String(nodeIndex+1).padStart(2,'0')}</span><strong>{node.signal}</strong><em>{answers[nodeIndex]===node.answer?'VERIFIED':'MISSED'}</em></div>)}</div>{!passed&&<button onClick={reset}><RotateCcw/> Re-run workbench</button>}</section>
  }

  return <section className="interactive-workbench active"><header><div><Terminal/><span>{scenario.mode} // LIVE SIMULATION</span></div><strong>NODE {String(index+1).padStart(2,'0')} / {String(scenario.nodes.length).padStart(2,'0')}</strong></header><div className="workbench-progress"><i style={{width:`${(index+(answered?1:0))/scenario.nodes.length*100}%`}}/></div><main><div className="decision-context"><span>SCENARIO INPUT</span><pre>{current.artifact}</pre></div><h2>{current.prompt}</h2><div className="decision-grid">{current.choices.map((choice,choiceIndex)=><button key={choice} disabled={answered} className={`${selected===choiceIndex?'selected':''} ${answered&&choiceIndex===current.answer?'correct':''} ${selected===choiceIndex&&!correct?'wrong':''}`} onClick={()=>choose(choiceIndex)}><span>{String.fromCharCode(65+choiceIndex)}</span><strong>{choice}</strong>{answered&&choiceIndex===current.answer&&<Check/>}</button>)}</div>{answered&&<div className={`decision-debrief ${correct?'correct':''}`}>{correct?<CheckCircle2/>:<X/>}<div><span>{correct?'DECISION ACCEPTED':'DECISION REJECTED'}</span><p>{current.feedback}</p><strong>{correct?current.signal:'Correct path highlighted above.'}</strong></div></div>}<button className="decision-next" disabled={!answered} onClick={advance}>{index===scenario.nodes.length-1?'Compile result':'Next decision'} <ArrowRight/></button></main></section>
}


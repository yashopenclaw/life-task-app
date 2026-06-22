import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAsync } from '../../core/useAsync';
import { Button, Card, Field, Row, SectionHeader, State } from '../../core/ui/atoms';
import { colors } from '../../core/theme';
import { caloriesApi } from './api';
import type { NutritionEstimate } from './types';

const today = () => new Date().toISOString().slice(0,10);

export default function CaloriesScreen(){
 const {data,loading,error,load}=useAsync(useCallback(()=>caloriesApi.list(),[]));
 const [date,setDate]=useState(today());
 const [item,setItem]=useState('');
 const [calories,setCalories]=useState('');
 const [estimate,setEstimate]=useState<NutritionEstimate|null>(null);
 const [estimating,setEstimating]=useState(false);
 async function estimateFood(){
  if(!item.trim()||estimating)return;
  setEstimating(true);
  try{const next=await caloriesApi.estimate(item.trim()); setEstimate(next); setCalories(String(next.calories));}
  finally{setEstimating(false);}
 }
 async function add(){ if(!item.trim()) return; await caloriesApi.create({date,item:item.trim(),calories:Number(calories||estimate?.calories||0),source:estimate?'ai':'manual',nutrition:estimate}); setItem(''); setCalories(''); setEstimate(null); await load(); }
 async function remove(id:string){ await caloriesApi.remove(id); await load(); }
 const grouped=useMemo(()=>{const out:Record<string, typeof data>={}; (data||[]).forEach(e=>{out[e.date]=[...(out[e.date]||[]),e]}); return out;},[data]);
 if(loading)return <State loading/>; if(error)return <State error={error} retry={load}/>;
 return <ScrollView><SectionHeader title="Add calories" subtitle="Type food → estimate nutrition → save."/><Card><Field label="Date" value={date} onChangeText={setDate}/><Field label="Food" value={item} onChangeText={(v)=>{setItem(v); setEstimate(null);}} placeholder="e.g. 2 eggs, dal, chicken breast"/><Row><Button title={estimating?'Estimating…':'Estimate with AI'} tone="good" onPress={estimateFood}/><Button title="Save" onPress={add}/></Row>{estimate?<View style={styles.estimate}><Text style={styles.kicker}>{estimate.confidence} confidence · {estimate.serving}</Text><Text style={styles.big}>{estimate.calories} cal</Text><Text style={styles.macro}>Protein {estimate.protein_g}g · Carbs {estimate.carbs_g}g · Fat {estimate.fat_g}g</Text><Text style={styles.note}>{estimate.notes}</Text></View>:<Field label="Calories" value={calories} onChangeText={setCalories} keyboardType="numeric"/>}</Card>{Object.keys(grouped).length===0?<State empty="No calorie entries yet."/>:Object.entries(grouped).map(([day,items])=>{const total=(items||[]).reduce((s,e)=>s+e.calories,0);return <View key={day}><SectionHeader title={day} subtitle={`${total} calories`}/>{(items||[]).map(e=><Card key={e.id}><Text style={styles.item}>{e.item}</Text><Text>{e.calories} cal · {e.source}</Text>{e.nutrition?<Text style={styles.macro}>P {e.nutrition.protein_g}g · C {e.nutrition.carbs_g}g · F {e.nutrition.fat_g}g</Text>:null}<Row><Button title="Delete" tone="danger" onPress={()=>remove(e.id)}/></Row></Card>)}</View>})}</ScrollView>;
}

const styles = StyleSheet.create({
 estimate:{marginTop:12,padding:14,borderRadius:16,backgroundColor:'#f8fafc',borderWidth:1,borderColor:colors.line},
 kicker:{color:colors.muted,fontWeight:'900',textTransform:'uppercase',fontSize:11},
 big:{fontSize:30,fontWeight:'900',color:colors.ink,marginTop:4},
 macro:{color:colors.ink,fontWeight:'700',marginTop:4},
 note:{color:colors.muted,marginTop:6},
 item:{fontWeight:'900',fontSize:16,color:colors.ink},
});

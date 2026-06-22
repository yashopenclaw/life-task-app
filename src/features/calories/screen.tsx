import { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useAsync } from '../../core/useAsync';
import { Button, Card, Field, Row, SectionHeader, State } from '../../core/ui/atoms';
import { caloriesApi } from './api';
const today = () => new Date().toISOString().slice(0,10);
export default function CaloriesScreen(){
 const {data,loading,error,load}=useAsync(useCallback(()=>caloriesApi.list(),[]));
 const [date,setDate]=useState(today()); const [item,setItem]=useState(''); const [calories,setCalories]=useState('');
 async function add(){ if(!item.trim()) return; await caloriesApi.create({date,item:item.trim(),calories:Number(calories||0),source:'manual'}); setItem(''); setCalories(''); await load(); }
 async function remove(id:string){ await caloriesApi.remove(id); await load(); }
 const grouped=useMemo(()=>{const out:Record<string, typeof data>={}; (data||[]).forEach(e=>{out[e.date]=[...(out[e.date]||[]),e]}); return out;},[data]);
 if(loading)return <State loading/>; if(error)return <State error={error} retry={load}/>;
 return <ScrollView><SectionHeader title="Add calories"/><Card><Field label="Date" value={date} onChangeText={setDate}/><Field label="Item" value={item} onChangeText={setItem}/><Field label="Calories" value={calories} onChangeText={setCalories} keyboardType="numeric"/><Button title="Add" onPress={add}/></Card>{Object.keys(grouped).length===0?<State empty="No calorie entries yet."/>:Object.entries(grouped).map(([day,items])=>{const total=(items||[]).reduce((s,e)=>s+e.calories,0);return <View key={day}><SectionHeader title={day} subtitle={`${total} calories`}/>{(items||[]).map(e=><Card key={e.id}><Text style={{fontWeight:'900'}}>{e.item}</Text><Text>{e.calories} cal · {e.source}</Text><Row><Button title="Delete" tone="danger" onPress={()=>remove(e.id)}/></Row></Card>)}</View>})}</ScrollView>;
}

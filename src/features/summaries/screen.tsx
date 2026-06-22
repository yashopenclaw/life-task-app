import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { useAsync } from '../../core/useAsync';
import { Button, Card, Field, SectionHeader, State } from '../../core/ui/atoms';
import { summariesApi } from './api';
const today=()=>new Date().toISOString().slice(0,10);
export default function SummariesScreen(){
 const {data,loading,error,load}=useAsync(useCallback(()=>summariesApi.list(),[]));
 const [date,setDate]=useState(today()),[did,setDid]=useState(''),[mattered,setMattered]=useState(''),[tomorrow,setTomorrow]=useState('');
 useEffect(()=>{const s=(data||[]).find(x=>x.date===date); if(s){setDid(s.did||'');setMattered(s.mattered||'');setTomorrow(s.tomorrow||'')}},[data,date]);
 async function save(){await summariesApi.upsert({date,did,mattered,tomorrow,picked_task_ids:[]}); await load();}
 if(loading)return <State loading/>; if(error)return <State error={error} retry={load}/>;
 return <ScrollView><SectionHeader title="Daily summary"/><Card><Field label="Date" value={date} onChangeText={setDate}/><Field label="Did" value={did} onChangeText={setDid} multiline/><Field label="Mattered" value={mattered} onChangeText={setMattered} multiline/><Field label="Tomorrow" value={tomorrow} onChangeText={setTomorrow} multiline/><Button title="Save" onPress={save}/></Card><SectionHeader title="Recent"/>{(data||[]).length===0?<State empty="No summaries yet."/>:(data||[]).map(s=><Card key={s.id}><Text style={{fontWeight:'900'}}>{s.date}</Text><Text>Did: {s.did||'—'}</Text><Text>Mattered: {s.mattered||'—'}</Text><Text>Tomorrow: {s.tomorrow||'—'}</Text></Card>)}</ScrollView>;
}

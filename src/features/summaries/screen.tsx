import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useAsync } from '../../core/useAsync';
import { Card, SectionHeader, State } from '../../core/ui/atoms';
import { NaturalCapture } from '../../core/ui/NaturalCapture';
import { summariesApi } from './api';
export default function SummariesScreen(){
 const {data,loading,error,load}=useAsync(useCallback(()=>summariesApi.list(),[]));
 const [busy,setBusy]=useState(false),[parsed,setParsed]=useState('');
 async function saveNatural(message:string, source:'typed'|'voice'){setBusy(true);setParsed('');try{const res=await summariesApi.natural(message,source);setParsed(JSON.stringify(res.parsed,null,2));await load();}finally{setBusy(false);}}
 if(loading)return <State loading/>; if(error)return <State error={error} retry={load}/>;
 return <ScrollView><SectionHeader title="Daily summary" subtitle="Dump the day naturally. Date defaults to today."/><NaturalCapture title="How did the day go?" prompt="Example: ‘built app, mattered because it works, tomorrow test APK’." placeholder="Type or dictate your daily dump…" busy={busy} onSubmit={saveNatural}/>{parsed?<Card><Text style={styles.json}>{parsed}</Text></Card>:null}<SectionHeader title="Recent"/>{(data||[]).length===0?<State empty="No summaries yet."/>:(data||[]).map(s=><Card key={s.id}><Text style={styles.date}>{s.date}</Text><Text>Did: {s.did||'—'}</Text><Text>Mattered: {s.mattered||'—'}</Text><Text>Tomorrow: {s.tomorrow||'—'}</Text></Card>)}</ScrollView>;
}
const styles=StyleSheet.create({json:{fontFamily:'monospace',color:'#0f172a'},date:{fontWeight:'900'}});

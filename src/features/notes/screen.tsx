import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useAsync } from '../../core/useAsync';
import { Button, Card, Field, Row, SectionHeader, State } from '../../core/ui/atoms';
import { colors } from '../../core/theme';
import { fonts } from '../../core/fonts';
import { notesApi } from './api';

export default function NotesScreen(){
 const {data,loading,error,load}=useAsync(useCallback(()=>notesApi.list(),[]));
 const [body,setBody]=useState('');
 async function add(){ if(!body.trim())return; await notesApi.create({body:body.trim()}); setBody(''); await load(); }
 async function remove(id:string){await notesApi.remove(id); await load();}
 if(loading)return <State loading/>; if(error)return <State error={error} retry={load}/>;
 return <ScrollView><SectionHeader title="Add note"/><Card><Field label="Body" value={body} onChangeText={setBody} multiline/><Button title="Add" onPress={add}/></Card>{(data||[]).length===0?<State empty="No notes yet."/>:(data||[]).map(n=><Card key={n.id}><Text style={styles.body}>{n.body}</Text><Text style={styles.meta}>{n.created_at}</Text><Row><Button title="Delete" tone="danger" onPress={()=>remove(n.id)}/></Row></Card>)}</ScrollView>;
}

const styles = StyleSheet.create({
 body: { color: colors.ink, fontFamily: fonts.bodyMedium },
 meta: { color: colors.muted, fontFamily: fonts.bodyMedium, marginTop: 6 },
});

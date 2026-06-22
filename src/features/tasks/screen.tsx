import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAsync } from '../../core/useAsync';
import { Button, Card, Field, Row, SectionHeader, State } from '../../core/ui/atoms';
import { colors } from '../../core/theme';
import { tasksApi } from './api';
import type { Bucket, Task } from './types';

const buckets: Bucket[] = ['buffer', 'timewise', 'recurring'];

export default function TasksScreen() {
  const loader = useCallback(() => tasksApi.list(), []);
  const { data, loading, error, load } = useAsync(loader);
  const [title, setTitle] = useState('');
  const [bucket, setBucket] = useState<Bucket>('buffer');
  const [scheduledAt, setScheduledAt] = useState('');
  const [priority, setPriority] = useState('0');

  async function add() {
    if (!title.trim()) return;
    await tasksApi.create({ title: title.trim(), bucket, scheduled_at: scheduledAt || null, priority: Number(priority || 0) });
    setTitle(''); setScheduledAt(''); setPriority('0'); setBucket('buffer'); await load();
  }
  async function complete(task: Task) { await tasksApi.update(task.id, { done: !task.done }); await load(); }
  async function remove(task: Task) { await tasksApi.remove(task.id); await load(); }

  if (loading) return <State loading />;
  if (error) return <State error={error} retry={load} />;
  const tasks = data || [];
  return <ScrollView style={styles.wrap}>
    <SectionHeader title="Add task" />
    <Card><Field label="Title" value={title} onChangeText={setTitle} /><Row>{buckets.map(b => <TouchableOpacity key={b} onPress={() => setBucket(b)} style={[styles.pill, bucket===b && styles.activePill]}><Text style={bucket===b ? styles.activePillText : styles.pillText}>{b}</Text></TouchableOpacity>)}</Row>{bucket==='timewise' ? <Field label="Scheduled time" placeholder="2026-06-23T10:00:00+05:30" value={scheduledAt} onChangeText={setScheduledAt} /> : null}<Field label="Priority" value={priority} onChangeText={setPriority} keyboardType="numeric" /><Button title="Add" onPress={add} /></Card>
    {buckets.map(b => { const group = tasks.filter(t => t.bucket === b); return <View key={b}><SectionHeader title={b.toUpperCase()} subtitle={`${group.length} item${group.length===1?'':'s'}`} />{group.length === 0 ? <State empty="No tasks here." /> : group.map(task => <Card key={task.id}><Text style={[styles.taskTitle, task.done && styles.done]}>{task.title}</Text>{task.bucket==='timewise' && task.scheduled_at ? <Text style={styles.meta}>When: {task.scheduled_at}</Text> : null}<Text style={styles.meta}>Priority {task.priority} · {task.done ? 'done' : 'open'}</Text><Row><Button title={task.done ? 'Undo' : 'Complete'} tone="good" onPress={() => complete(task)} /><Button title="Delete" tone="danger" onPress={() => remove(task)} /></Row></Card>)}</View>; })}
  </ScrollView>;
}
const styles = StyleSheet.create({ wrap:{flex:1}, pill:{backgroundColor:colors.pill,paddingVertical:8,paddingHorizontal:10,borderRadius:999,marginRight:8,marginBottom:12}, activePill:{backgroundColor:colors.primary}, pillText:{fontWeight:'800',color:colors.ink}, activePillText:{fontWeight:'800',color:'#fff'}, taskTitle:{fontSize:16,fontWeight:'900',color:colors.ink}, done:{textDecorationLine:'line-through',color:colors.muted}, meta:{color:colors.muted,marginTop:4} });

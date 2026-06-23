import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAsync } from '../../core/useAsync';
import { Button, Card, Row, SectionHeader, State } from '../../core/ui/atoms';
import { NaturalCapture } from '../../core/ui/NaturalCapture';
import { colors } from '../../core/theme';
import { tasksApi } from './api';
import type { Bucket, Task } from './types';
const buckets: Bucket[] = ['buffer', 'timewise', 'recurring'];
export default function TasksScreen() {
  const { data, loading, error, load } = useAsync(useCallback(() => tasksApi.list(), []));
  const [busy, setBusy] = useState(false);
  const [parsed, setParsed] = useState('');
  async function addNatural(message: string, source: 'typed' | 'voice') {
    setBusy(true); setParsed('');
    try { const res = await tasksApi.natural(message, source); setParsed(JSON.stringify(res.parsed, null, 2)); await load(); }
    finally { setBusy(false); }
  }
  async function complete(task: Task) { await tasksApi.update(task.id, { done: !task.done }); await load(); }
  async function remove(task: Task) { await tasksApi.remove(task.id); await load(); }
  if (loading) return <State loading />; if (error) return <State error={error} retry={load} />;
  const tasks = data || [];
  return <ScrollView style={styles.wrap}>
    <SectionHeader title="Tasks" subtitle="Say the task. I’ll decide buffer/time/timewise/recurring and save it." />
    <NaturalCapture title="What should be done?" prompt="No forms. Try: ‘pay electricity bill tomorrow 10am’ or ‘gym every day’." placeholder="Type or dictate a task…" busy={busy} onSubmit={addNatural} />
    {parsed ? <Card><Text style={styles.json}>{parsed}</Text></Card> : null}
    {buckets.map(b => { const group = tasks.filter(t => t.bucket === b); return <View key={b}><SectionHeader title={b.toUpperCase()} subtitle={`${group.length} item${group.length===1?'':'s'}`} />{group.length === 0 ? <State empty="No tasks here." /> : group.map(task => <Card key={task.id}><Text style={[styles.taskTitle, task.done && styles.done]}>{task.title}</Text>{task.bucket==='timewise' && task.scheduled_at ? <Text style={styles.meta}>When: {task.scheduled_at}</Text> : null}{task.recurring_rule ? <Text style={styles.meta}>Repeats: {task.recurring_rule.replace('natural:', '')}</Text> : null}<Text style={styles.meta}>Priority {task.priority} · {task.done ? 'done' : 'open'}</Text><Row><Button title={task.done ? 'Undo' : 'Complete'} tone="good" onPress={() => complete(task)} /><Button title="Delete" tone="danger" onPress={() => remove(task)} /></Row></Card>)}</View>; })}
  </ScrollView>;
}
const styles = StyleSheet.create({ wrap:{flex:1}, taskTitle:{fontSize:16,fontWeight:'900',color:colors.ink}, done:{textDecorationLine:'line-through',color:colors.muted}, meta:{color:colors.muted,marginTop:4}, json:{fontFamily:'monospace', color:'#0f172a'} });

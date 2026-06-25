import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { Easing, runOnJS, useAnimatedProps, useAnimatedReaction, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
import { useAsync } from '../../core/useAsync';
import { State } from '../../core/ui/atoms';
import { GlassCard } from '../../core/ui/GlassCard';
import { colors } from '../../core/theme';
import { fonts } from '../../core/fonts';
import { assistantApi } from '../assistant/api';
import { caloriesApi } from './api';

const DEFAULT_DAILY_GOAL = 2200;

type VoicePhase = 'idle' | 'recording' | 'transcribing';

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function CaloriesScreen() {
  const { width } = useWindowDimensions();
  const narrowPhone = width < 390;
  const { data, loading, error, load, setData } = useAsync(useCallback(() => caloriesApi.list(), []));
  const settingsState = useAsync(useCallback(() => caloriesApi.settings(), []));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const dailyGoal = settingsState.data?.daily_goal || DEFAULT_DAILY_GOAL;
  const [goalEditOpen, setGoalEditOpen] = useState(false);
  const [goalDraft, setGoalDraft] = useState(String(dailyGoal));
  useEffect(() => { setGoalDraft(String(dailyGoal)); }, [dailyGoal]);
  const [selectedDate, setSelectedDate] = useState('');

  // Voice state
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>('idle');
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [permsGranted, setPermsGranted] = useState(false);

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (status.granted) { setPermsGranted(true); await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }); }
    })();
  }, []);

  const today = localDateKey();
  const activeDate = selectedDate || today;
  const isToday = activeDate === today;

  async function handleRingPress() {
    if (!isToday) return;
    if (voicePhase === 'recording') {
      await recorder.stop();
      const uri: string | null = recorder.uri;
      if (!uri) { setVoicePhase('idle'); Alert.alert('Recording failed', 'No audio captured.'); return; }
      setVoicePhase('transcribing');
      setRecordingUri(uri);
      return;
    }
    if (voicePhase === 'idle' && !busy) {
      if (!permsGranted) {
        const status = await AudioModule.requestRecordingPermissionsAsync();
        if (!status.granted) { Alert.alert('Mic denied', 'Allow microphone access.'); return; }
        setPermsGranted(true);
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      }
      try { await recorder.prepareToRecordAsync(); recorder.record(); setVoicePhase('recording'); }
      catch { Alert.alert('Mic error', 'Could not start recording.'); }
    }
  }

  // Transcribe when URI is set, then submit the raw food text.
  useEffect(() => {
    if (recordingUri && voicePhase === 'transcribing') {
      (async () => {
        try {
          const text = await assistantApi.transcribe(recordingUri);
          if (text.trim()) await submitEntry(text, 'voice');
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Could not transcribe audio.';
          Alert.alert('Transcribe failed', msg);
        }
        finally { setVoicePhase('idle'); setRecordingUri(null); }
      })();
    }
  }, [recordingUri, voicePhase]);

  async function saveGoal() {
    const next = Math.max(1, Math.min(20000, Number.parseInt(goalDraft.replace(/[^0-9]/g, ''), 10) || DEFAULT_DAILY_GOAL));
    setGoalEditOpen(false);
    try { const saved = await caloriesApi.updateSettings({ daily_goal: next }); settingsState.setData(saved); setGoalDraft(String(saved.daily_goal)); }
    catch { setGoalDraft(String(dailyGoal)); }
  }

  async function submitEntry(text: string, source: 'typed' | 'voice') {
    const clean = text.trim(); if (!clean || busy) return;
    setBusy(true);
    try {
      const result = await caloriesApi.natural(clean, source, today);
      let itemTitle = result.entry.item;
      if (source === 'voice') {
        itemTitle = await assistantApi.title(clean).catch(() => result.entry.item);
      }
      setData(prev => [{ ...result.entry, item: itemTitle }, ...(prev || [])]);
      setMessage('');
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    const existing = data || [];
    const removed = existing.find(entry => entry.id === id);
    setData(existing.filter(entry => entry.id !== id));
    try { await caloriesApi.remove(id); }
    catch (err) { if (removed) setData(prev => [removed, ...(prev || [])]); throw err; }
  }

  const dates = useMemo(() => {
    const set = new Set((data || []).map(e => e.date));
    set.add(today);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [data, today]);

  const totalsByDate = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of (data || [])) m[e.date] = (m[e.date] || 0) + e.calories;
    return m;
  }, [data]);

  const items = (data || []).filter(entry => entry.date === activeDate);
  const total = items.reduce((sum, entry) => sum + entry.calories, 0);
  const remaining = dailyGoal - total;
  const percent = Math.min(100, Math.round((total / dailyGoal) * 100));
  const macros = useMemo(() => items.reduce((acc, entry) => { acc.protein += entry.nutrition?.protein_g || 0; acc.carbs += entry.nutrition?.carbs_g || 0; acc.fat += entry.nutrition?.fat_g || 0; return acc; }, { protein: 0, carbs: 0, fat: 0 }), [items]);
  if (loading || settingsState.loading) return <State loading />; if (error || settingsState.error) return <State error={error || settingsState.error} retry={() => { load(); settingsState.load(); }} />;

  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.wrap}>
    <View style={styles.header}>
      <Text style={styles.kicker}>NUTRITION</Text>
      <Text style={styles.title}>Calories</Text>
    </View>

    {/* Day selector — horizontal scroll, calorie total per day */}
    <DayStrip dates={dates} totalsByDate={totalsByDate} today={today} selectedDate={activeDate} onSelect={setSelectedDate} />

    {/* Ring — tap to voice record (today only). Shows mic/waves while recording, spinner while transcribing */}
    <View style={styles.ringHero}>
      <CalorieRing total={total} goal={dailyGoal} remaining={remaining} voicePhase={isToday ? voicePhase : 'idle'} recordingDuration={recorderState.durationMillis} onPress={handleRingPress} interactive={isToday} />
    </View>

    {/* Goal line */}
    <Pressable onPress={() => { setGoalDraft(String(dailyGoal)); setGoalEditOpen(!goalEditOpen); }} style={styles.goalLine}>
      <Text style={styles.goalLineText}>Goal: {dailyGoal.toLocaleString('en-IN')} kcal</Text>
      <Text style={styles.goalLineEdit}>{goalEditOpen ? 'cancel' : 'edit'}</Text>
    </Pressable>
    {goalEditOpen ? <View style={styles.goalEditRow}>
      <TextInput value={goalDraft} onChangeText={setGoalDraft} keyboardType="number-pad" returnKeyType="done" onSubmitEditing={saveGoal} style={styles.goalInput} autoFocus />
      <Pressable onPress={saveGoal} style={styles.goalSave}><Text style={styles.goalSaveText}>Save</Text></Pressable>
    </View> : null}

    {/* Macros */}
    <View style={styles.macroRow}>
      <Macro value={Math.round(macros.protein)} label="Protein" color="#f3be65" />
      <Macro value={Math.round(macros.carbs)} label="Carbs" color={colors.lime} />
      <Macro value={Math.round(macros.fat)} label="Fat" color="#e4d561" />
    </View>

    {/* Text input — text only, submit arrow (today only) */}
    {isToday ? <GlassCard style={styles.inputBar} contentStyle={styles.inputBarInner}>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder='Log food — "two eggs and toast"'
        placeholderTextColor="#555b66"
        style={styles.input}
        onSubmitEditing={() => submitEntry(message, 'typed')}
        editable={!busy}
      />
      <Pressable onPress={() => submitEntry(message, 'typed')} disabled={busy || !message.trim()} style={[styles.submitButton, (busy || !message.trim()) && styles.submitButtonDisabled]}>
        {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitArrow}>↑</Text>}
      </Pressable>
    </GlassCard> : null}

    {/* Selected day entries */}
    <Text style={styles.sectionLabel}>{isToday ? 'Today' : dayLabel(activeDate, today)} · {items.length}</Text>
    {items.length === 0
      ? <Text style={styles.empty}>{isToday ? 'Nothing logged yet.' : 'No entries for this day.'}</Text>
      : items.map(entry => <GlassCard key={entry.id} style={styles.foodCard} contentStyle={styles.foodCardInner}>
          <View style={styles.foodInfo}>
            <Text style={styles.foodTitle}>{entry.item}</Text>
            <Text style={styles.foodSub}>{entry.nutrition?.serving || entry.source}</Text>
            {entry.nutrition ? <View style={styles.foodMacros}>
              <FoodMacro label="P" value={entry.nutrition.protein_g} />
              <FoodMacro label="C" value={entry.nutrition.carbs_g} />
              <FoodMacro label="F" value={entry.nutrition.fat_g} />
            </View> : null}
          </View>
          <View style={styles.foodCalCol}>
            <Text style={styles.foodCal}>{entry.calories}</Text>
            <Text style={styles.foodCalUnit}>kcal</Text>
          </View>
          {isToday ? <Pressable accessibilityRole="button" onPress={() => remove(entry.id)} hitSlop={8} style={styles.foodDelete}>
            <Text style={styles.foodDeleteText}>×</Text>
          </Pressable> : null}
        </GlassCard>)}
  </ScrollView>;
}

function dayLabel(dateStr: string, today: string): string {
  if (dateStr === today) return 'Today';
  const d = new Date(dateStr + 'T00:00:00');
  const t = new Date(today + 'T00:00:00');
  const diff = Math.round((t.getTime() - d.getTime()) / 86400000);
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function dateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function DayStrip({ dates, totalsByDate, today, selectedDate, onSelect }: {
  dates: string[]; totalsByDate: Record<string, number>; today: string; selectedDate: string; onSelect: (d: string) => void;
}) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayStripInner}>
    {dates.map(d => {
      const active = d === selectedDate;
      const cals = totalsByDate[d] || 0;
      return <Pressable key={d} onPress={() => onSelect(d)} style={[styles.dayChip, active && styles.dayChipActive]}>
        <Text style={[styles.dayChipLabel, active && styles.dayChipLabelActive]}>{dayLabel(d, today)}</Text>
        <Text style={[styles.dayChipCals, active && styles.dayChipCalsActive]}>{cals.toLocaleString('en-IN')}</Text>
        <Text style={[styles.dayChipDate, active && styles.dayChipDateActive]}>{dateShort(d)}</Text>
      </Pressable>;
    })}
  </ScrollView>;
}

function CalorieRing({ total, goal, remaining, voicePhase, recordingDuration, onPress, interactive }: {
  total: number; goal: number; remaining: number;
  voicePhase: VoicePhase; recordingDuration: number; onPress: () => void; interactive?: boolean;
}) {
  const circumference = 439.8;
  const targetFraction = Math.max(0, Math.min(1, total / goal));
  const anim = useSharedValue(0);
  const [shownTotal, setShownTotal] = useState(0);
  useEffect(() => {
    anim.value = 0;
    anim.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) });
  }, [total, anim]);
  useAnimatedReaction(() => anim.value, v => { runOnJS(setShownTotal)(Math.round(total * v)); }, [total]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - targetFraction * anim.value) }));
  const over = remaining < 0;
  const isRecording = voicePhase === 'recording';
  const isTranscribing = voicePhase === 'transcribing';

  // Pulse animation for recording state
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (isRecording) pulse.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true);
    else pulse.value = 0;
  }, [isRecording]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.06 }] }));

  return <Pressable onPress={onPress} style={styles.ringPressable}>
    <Animated.View style={[styles.ringOuter, pulseStyle]}>
      <Svg width={180} height={180} viewBox="0 0 168 168" style={styles.ringSvg}>
        <Defs>
          <LinearGradient id="calorieArc" x1="20" y1="20" x2="148" y2="148">
            <Stop offset="0" stopColor={isRecording ? colors.lime : over ? colors.danger : '#f3be65'} />
            <Stop offset="1" stopColor={isRecording ? '#a8ff00' : over ? '#ff8a8a' : colors.lime} />
          </LinearGradient>
        </Defs>
        <Circle cx="84" cy="84" r="70" stroke="rgba(255,255,255,0.06)" strokeWidth="10" fill="transparent" />
        <AnimatedCircle cx="84" cy="84" r="70" stroke="url(#calorieArc)" strokeWidth="10" fill="transparent" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} animatedProps={animatedProps} rotation="-90" origin="84,84" />
      </Svg>
      <View style={styles.ringInner}>
        {isRecording ? <>
          <WaveBars />
          <Text style={styles.ringListening}>{Math.round(recordingDuration / 1000)}s</Text>
        </> : isTranscribing ? <>
          <ActivityIndicator size="large" color={colors.lime} />
          <Text style={styles.ringListening}>Parsing…</Text>
        </> : <>
          <Text style={styles.ringTotal}>{shownTotal.toLocaleString('en-IN')}</Text>
          <Text style={styles.ringUnit}>of {goal.toLocaleString('en-IN')}</Text>
          <Text style={[styles.ringRemaining, over && styles.ringOver]}>{over ? `${Math.abs(remaining).toLocaleString('en-IN')} over` : `${remaining.toLocaleString('en-IN')} left`}</Text>
          {interactive !== false ? <Text style={styles.ringHint}>tap to speak</Text> : null}
        </>}
      </View>
    </Animated.View>
  </Pressable>;
}

function WaveBars() {
  return <View style={styles.waveBars}>{[0, 1, 2, 3, 4].map(i => <WaveBar key={i} index={i} />)}</View>;
}
function WaveBar({ index }: { index: number }) {
  const v = useSharedValue(0.3);
  useEffect(() => {
    v.value = withDelay(index * 60, withRepeat(withTiming(1, { duration: 250 + (index % 3) * 100, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [v, index]);
  const style = useAnimatedStyle(() => ({ height: 6 + v.value * 22 }));
  return <Animated.View style={[styles.waveBar, style]} />;
}

function Macro({ value, label, color }: { value: number; label: string; color: string }) {
  return <GlassCard style={styles.macro} contentStyle={styles.macroInner}>
    <Text style={[styles.macroValue, { color }]}>{value}<Text style={styles.macroUnit}>g</Text></Text>
    <Text style={styles.macroLabel}>{label}</Text>
  </GlassCard>;
}
function FoodMacro({ label, value }: { label: string; value?: number }) {
  return <View style={styles.foodMacroPill}><Text style={styles.foodMacroLabel}>{label}</Text><Text style={styles.foodMacroValue}>{Math.round(value || 0)}g</Text></View>;
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 24 },
  header: { alignItems: 'center', marginTop: 4 },
  kicker: { color: '#6c717c', fontSize: 10, letterSpacing: 3.8, fontFamily: fonts.bodySemibold },
  title: { color: colors.ink, fontSize: 34, fontFamily: fonts.displaySemibold, letterSpacing: -1.0, marginTop: 6 },
  dayStripInner: { flexDirection: 'row', gap: 8, paddingVertical: 10, marginBottom: 4 },
  dayChip: { width: 68, borderRadius: 16, paddingVertical: 10, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  dayChipActive: { backgroundColor: 'rgba(243,190,101,0.12)', borderColor: 'rgba(243,190,101,0.35)' },
  dayChipLabel: { color: colors.muted, fontSize: 11, fontFamily: fonts.bodySemibold },
  dayChipLabelActive: { color: '#f3be65' },
  dayChipCals: { color: colors.soft, fontSize: 15, fontFamily: fonts.displaySemibold, marginTop: 4, letterSpacing: -0.3 },
  dayChipCalsActive: { color: colors.ink },
  dayChipDate: { color: colors.faint, fontSize: 9, fontFamily: fonts.bodyMedium, marginTop: 3 },
  dayChipDateActive: { color: colors.muted },
  ringHero: { alignItems: 'center', marginTop: 20, marginBottom: 16 },
  ringPressable: { alignItems: 'center', justifyContent: 'center' },
  ringOuter: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center', shadowColor: colors.lime, shadowOpacity: 0.18, shadowRadius: 24, elevation: 6 },
  ringSvg: { position: 'absolute' },
  ringInner: { width: 130, height: 130, borderRadius: 65, alignItems: 'center', justifyContent: 'center' },
  ringTotal: { color: colors.ink, fontSize: 40, fontFamily: fonts.displaySemibold, letterSpacing: -1.2 },
  ringUnit: { color: colors.muted, fontSize: 12, fontFamily: fonts.bodyMedium, marginTop: 2 },
  ringRemaining: { color: colors.lime, fontSize: 13, fontFamily: fonts.bodySemibold, marginTop: 8, letterSpacing: 0.3 },
  ringOver: { color: colors.danger },
  ringHint: { color: colors.faint, fontSize: 10, fontFamily: fonts.bodyMedium, marginTop: 6 },
  ringListening: { color: colors.lime, fontSize: 13, fontFamily: fonts.bodySemibold, marginTop: 8 },
  waveBars: { flexDirection: 'row', alignItems: 'center', height: 30, gap: 4 },
  waveBar: { width: 4, borderRadius: 2, backgroundColor: colors.lime },
  goalLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 },
  goalLineText: { color: colors.muted, fontSize: 13, fontFamily: fonts.bodyMedium },
  goalLineEdit: { color: colors.primary, fontSize: 12, fontFamily: fonts.bodySemibold },
  goalEditRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 },
  goalInput: { width: 100, height: 40, borderRadius: 14, paddingHorizontal: 12, textAlign: 'center', color: colors.ink, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', fontFamily: fonts.displaySemibold, fontSize: 18 },
  goalSave: { height: 40, borderRadius: 14, paddingHorizontal: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  goalSaveText: { color: '#fff', fontFamily: fonts.bodySemibold, fontSize: 13 },
  macroRow: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 24 },
  macro: { flex: 1, height: 72, borderRadius: 20 },
  macroInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  macroValue: { fontFamily: fonts.displaySemibold, fontSize: 20, letterSpacing: -0.3 },
  macroUnit: { fontSize: 13, fontFamily: fonts.bodyMedium, color: colors.muted },
  macroLabel: { color: colors.muted, fontSize: 11, fontFamily: fonts.bodyMedium, marginTop: 5, letterSpacing: 0.3 },
  inputBar: { height: 54, borderRadius: 20, marginBottom: 24 },
  inputBarInner: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 6 },
  input: { flex: 1, color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 14 },
  submitButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  submitButtonDisabled: { opacity: 0.4 },
  submitArrow: { color: '#fff', fontFamily: fonts.bodySemibold, fontSize: 22, lineHeight: 24 },
  sectionLabel: { color: colors.muted, fontSize: 12, fontFamily: fonts.bodySemibold, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 },
  empty: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 14, paddingVertical: 10 },
  foodCard: { minHeight: 72, borderRadius: 20, marginBottom: 8 },
  foodCardInner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  foodInfo: { flex: 1 },
  foodTitle: { color: colors.ink, fontFamily: fonts.bodySemibold, fontSize: 14 },
  foodSub: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 11, marginTop: 3 },
  foodMacros: { flexDirection: 'row', gap: 6, marginTop: 8 },
  foodMacroPill: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: 'rgba(255,255,255,0.04)' },
  foodMacroLabel: { color: '#7a808a', fontFamily: fonts.bodySemibold, fontSize: 9 },
  foodMacroValue: { color: colors.soft, fontFamily: fonts.bodySemibold, fontSize: 10 },
  foodCalCol: { alignItems: 'flex-end', minWidth: 48 },
  foodCal: { color: colors.lime, fontFamily: fonts.displaySemibold, fontSize: 18, letterSpacing: -0.3 },
  foodCalUnit: { color: colors.muted, fontSize: 9, fontFamily: fonts.bodySemibold, marginTop: 2 },
  foodDelete: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  foodDeleteText: { color: '#ff9f9f', fontFamily: fonts.displayMedium, fontSize: 20, lineHeight: 22 },
});

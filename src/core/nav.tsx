import { ComponentType, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { features } from '../features';
import { colors } from './theme';

export function NavShell() {
  const [selectedKey, setSelectedKey] = useState(features[0]?.key || '');
  const selected = useMemo(() => features.find(f => f.key === selectedKey) || features[0], [selectedKey]);
  const Screen = selected?.component as ComponentType;
  return <View style={styles.app}><View style={styles.header}><Text style={styles.title}>Life Task</Text></View><View style={styles.layout}><ScrollView style={styles.nav}>{features.map(f => <TouchableOpacity key={f.key} accessibilityRole="button" onPress={() => setSelectedKey(f.key)} {...({ onClick: () => setSelectedKey(f.key) } as object)} style={[styles.navItem, selectedKey===f.key && styles.navItemActive]}><Text style={[styles.navText, selectedKey===f.key && styles.navTextActive]}>{f.title}</Text></TouchableOpacity>)}</ScrollView><View style={styles.content}>{Screen ? <><Text style={styles.pageTitle}>{selected.title}</Text><Screen /></> : <Text>No screen.</Text>}</View></View></View>;
}
const styles = StyleSheet.create({ app:{flex:1,backgroundColor:colors.bg,paddingTop:36}, header:{paddingHorizontal:16,paddingBottom:12,borderBottomWidth:1,borderColor:colors.line,backgroundColor:colors.surface}, title:{fontSize:26,fontWeight:'900',color:colors.ink}, layout:{flex:1,flexDirection:'row'}, nav:{width:150,backgroundColor:colors.surface,borderRightWidth:1,borderColor:colors.line}, navItem:{padding:14,borderBottomWidth:1,borderColor:'#f1f5f9'}, navItemActive:{backgroundColor:colors.ink}, navText:{fontWeight:'900',color:colors.ink}, navTextActive:{color:'#fff'}, content:{flex:1,padding:16}, pageTitle:{fontSize:24,fontWeight:'900',marginBottom:8,color:colors.ink} });

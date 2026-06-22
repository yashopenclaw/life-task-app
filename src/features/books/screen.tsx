import { useCallback, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { useAsync } from '../../core/useAsync';
import { Button, Card, Field, Row, SectionHeader, State } from '../../core/ui/atoms';
import { booksApi } from './api';
export default function BooksScreen(){
 const {data,loading,error,load}=useAsync(useCallback(()=>booksApi.list(),[]));
 const [title,setTitle]=useState(''),[author,setAuthor]=useState(''),[rating,setRating]=useState('0');
 async function add(){ if(!title.trim()||!author.trim())return; await booksApi.create({title:title.trim(),author:author.trim(),rating:Number(rating||0)}); setTitle(''); setAuthor(''); setRating('0'); await load(); }
 async function remove(id:string){ await booksApi.remove(id); await load(); }
 if(loading)return <State loading/>; if(error)return <State error={error} retry={load}/>;
 return <ScrollView><SectionHeader title="Add book"/><Card><Field label="Title" value={title} onChangeText={setTitle}/><Field label="Author" value={author} onChangeText={setAuthor}/><Field label="Rating" value={rating} onChangeText={setRating} keyboardType="numeric"/><Button title="Add" onPress={add}/></Card>{(data||[]).length===0?<State empty="No books yet."/>:(data||[]).map(b=><Card key={b.id}><Text style={{fontWeight:'900'}}>{b.title}</Text><Text>by {b.author}</Text><Text>Rating: {b.rating}/10</Text><Row><Button title="Delete" tone="danger" onPress={()=>remove(b.id)}/></Row></Card>)}</ScrollView>;
}

/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useEffect, useRef, useState} from 'react';
import {ScrollView, Image, Text, TouchableOpacity, View} from 'react-native';

import SendBird from 'sendbird';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {GroupChannel} from 'sendbird';

const sb = new SendBird({
  appId: '',
  localCacheEnabled: true,
});

sb.useAsyncStorageAsDatabase(AsyncStorage);

const App = () => {
  const [user, setUser] = useState();
  const [channel, setChannel] = useState();

  useEffect(() => {
    sb.connect('USER_1', (_user, err) => {
      if (_user) {
        setUser(_user);
      }
    });
  }, []);

  return (
    <View
      style={{
        paddingTop: 80,
        justifyContent: 'center',
        height: '100%',
      }}>
      <Text>USER: {user?.userId}</Text>
      {channel && <Channel channel={channel} setChannel={setChannel} />}
      {user && <Channels setChannel={setChannel} />}
    </View>
  );
};

const Channels = ({setChannel}) => {
  const [, setState] = useState(0);
  const collection = useRef(
    sb.GroupChannel.createGroupChannelCollection().setLimit(20).build(),
  );

  useEffect(() => {
    (async () => {
      while (collection.current.hasMore) {
        await collection.current.loadMore();
        setState(p => p + 1);
      }
    })();
  }, []);

  return (
    <ScrollView style={{borderWidth: 1}}>
      {collection.current.channelList.map(channel => {
        return (
          <TouchableOpacity
            key={channel.url}
            onPress={() => setChannel(channel)}>
            <Image
              source={{uri: channel.coverUrl}}
              style={{width: 30, height: 30, borderRadius: 15}}
            />
            <Text>
              {channel.name} {channel.url}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const Channel = ({channel, setChannel}: {channel: GroupChannel}) => {
  const [messages, setMessages] = useState([]);
  const collection = useRef(
    channel.createMessageCollection().setLimit(50).build(),
  );

  useEffect(() => {
    collection.current
      .initialize(
        sb.MessageCollection.MessageCollectionInitPolicy
          .CACHE_AND_REPLACE_BY_API,
      )
      .onCacheResult((err, messages) => {
        console.log('onCache', err, messages.length);
        setMessages(messages);
      })
      .onApiResult((err, messages) => {
        console.log('onApi', err, messages.length);
        setMessages(messages);
      });
  }, []);

  return (
    <View key={channel.url} style={{borderWidth: 2}}>
      <View style={{flexDirection: 'row', justifyContent: 'space-around'}}>
        <TouchableOpacity
          onPress={() => {
            const params = new sb.UserMessageParams();
            params.message = 'TEXT_' + Math.random();
            channel.sendUserMessage(params, msg => {
              setMessages(prev => [...prev, msg]);
            });
          }}>
          <Text>{'Send message'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setChannel()}>
          <Text>{'Clear'}</Text>
        </TouchableOpacity>
        {collection.current.hasPrevious && (
          <TouchableOpacity
            onPress={async () => {
              if (collection.current.hasPrevious) {
                const list = await collection.current.loadPrevious();
                setMessages(prev => [...prev, ...list]);
              }
            }}>
            <Text>{'load more'}</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView>
        {messages.map(msg => {
          return (
            <Text key={msg.messageId ?? msg.reqId} style={{borderWidth: 1}}>
              {msg.message}
            </Text>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default App;

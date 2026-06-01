import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText } from './AppText';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message: string };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message ?? '알 수 없는 오류' };
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <AppText style={styles.emoji}>⚠️</AppText>
        <AppText style={styles.title}>문제가 발생했어요</AppText>
        <AppText style={styles.desc}>앱을 다시 시작하거나 아래 버튼을 눌러주세요.</AppText>
        <TouchableOpacity style={styles.button} onPress={this.handleReset}>
          <AppText style={styles.buttonText}>다시 시도</AppText>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 10, color: '#1a1a1a' },
  desc: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 32 },
  button: {
    backgroundColor: '#4A90D9',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});

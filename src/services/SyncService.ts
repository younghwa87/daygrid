import { doc, setDoc, getDoc } from 'firebase/firestore';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { db, auth } from './firebase';
import { Schedule, ColorCategory } from '../types';

export type BackupSettings = {
  blockSize: string;
  timeFormat: string;
  textSize: string;
  textPosition: string;
  gridStartHour: number;
  gridEndHour: number;
  darkMode: boolean;
};

export type BackupData = {
  schedules: Schedule[];
  colorCategories: ColorCategory[];
  settings: BackupSettings;
  updatedAt: number;
};

const backupRef = (uid: string) => doc(db, 'users', uid, 'data', 'backup');

export async function pushBackup(uid: string, data: BackupData): Promise<void> {
  await setDoc(backupRef(uid), data);
}

export async function pullBackup(uid: string): Promise<BackupData | null> {
  const snap = await getDoc(backupRef(uid));
  return snap.exists() ? (snap.data() as BackupData) : null;
}

export async function signOutGoogle(): Promise<void> {
  await firebaseSignOut(auth);
}

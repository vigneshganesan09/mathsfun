import { useEffect, useRef, useState } from 'react';
import Boek from './Boek';
import { GROEPEN, makeLevel, type Groep, type LevelNo, type Question, type Topic } from './curriculum';
import Finish from './Finish';
import Klas from './Klas';
import { LessonList, LessonPlayer } from './Lessons';
import type { Lesson } from './lessonData';
import Parents from './Parents';
import Play, { type PlayMode, type RoundResult } from './Play';
import type { Book } from './readingData';
import { BookReader, Library, WordPractice } from './Reading';
import { buildRound, dueSkills, isoDay, newStickers, streak, updateSkill, type Sticker } from './review';
import { starsFor, UNLOCK_STARS, type StarCount } from './scoring';
import { setVoicePrefs } from './speech';
import Start from './Start';
import {
  allLevelStars,
  loadCurrentProfileId,
  loadProfiles,
  loadSettings,
  loadSkills,
  loadStats,
  saveLevelStars,
  saveSettings,
  saveSkills,
  saveStars,
  saveStats,
  setActiveProfile,
  type Profile,
  type Settings, lessonKey, markCompleted, tableLearnKey } from './storage';
import { STORY_GROEP } from './stories';
import Tables from './Tables';
import TeacherPicker from './TeacherPicker';
import { learnQuestions, tableScoreId, tableTopic, testQuestions, type TableId, type TableMode } from './tableData';
import { ModeChooser, ParentGate, ProfilePicker, Splash, StickerBook, type Mode } from './Welcome';
import WorldMap, { beastIndex, worldFound } from './WorldMap';
import Toets from './Toets';
import { CLOUD_RESTORED_EVENT, cloudRecord } from './cloud';
import { buildToets, PASS_PCT, toetsId, type Tier } from './toetsData';

const QUIZ_LENGTH = 5;

function toetsSubtitle(tier: Tier, r: RoundResult): string {
  const pct = Math.round((100 * r.correct) / Math.max(1, r.total));
  return pct >= PASS_PCT
    ? `Toets ${tier.name.nl}: ${pct}% · geslaagd! / passed!`
    : `Toets ${tier.name.nl}: ${pct}% · nog niet geslaagd, ${PASS_PCT}% nodig / not passed yet, ${PASS_PCT}% needed`;
}
const MIX_LENGTH = 10;

/** Where a round of questions came from. */
type Source =
  | { kind: 'level'; groep: Groep; level: LevelNo }
  | { kind: 'quiz'; lesson: Lesson }
  | { kind: 'table'; table: TableId; mode: TableMode }
  | { kind: 'mix' }
  | { kind: 'toets'; groep: Groep; tier: Tier };

type Screen =
  | { name: 'home' }
  | { name: 'map'; groep: Groep }
  | { name: 'lessons' }
  | { name: 'lesson'; lesson: Lesson }
  | { name: 'tables'; table: TableId | null }
  | { name: 'library' }
  | { name: 'book'; book: Book }
  | { name: 'words'; words: { word: string; sentence: string }[] }
  | { name: 'stickers' }
  | { name: 'teacher' }
  | { name: 'toets' }
  | { name: 'play'; source: Source; topic: Topic; questions: Question[]; run: number }
  | {
      name: 'finish';
      source: Source;
      topic: Topic;
      result: RoundResult;
      levelStars?: StarCount;
      newBest: boolean;
      stickers: Sticker[];
      /** Index of the Telbeestje found in this round (first star in a world). */
      beast?: number;
    }
  | { name: 'parents'; back: Screen };

type Phase = 'splash' | 'modes' | 'profiles' | 'class' | 'book' | 'home';

let runCounter = 0;

const MODE_LABEL: Record<TableMode, string> = { learn: 'Leren', write: 'Schrijftoets', say: 'Spreektoets' };
const MIX_TOPIC: Topic = { id: 'dagmix', name: { nl: 'Dagmix', en: 'Daily mix' }, make: () => GROEPEN[0].topics[0].make(1, Math.random) };
const ALL_TOPICS = [...GROEPEN.flatMap((g) => g.topics), ...STORY_GROEP.topics];

const today = () => isoDay(new Date());

/** Count starred levels, three-star levels and finished worlds from the saved stars. */
function levelStats() {
  const all = allLevelStars();
  const values = Object.values(all);
  return {
    starredLevels: values.filter((s) => s >= 1).length,
    threeStarLevels: values.filter((s) => s === 3).length,
    // A world counts as done after levels 1–3; levels 4–5 are the extra challenge.
    worldsDone: ALL_TOPICS.filter((t) => [1, 2, 3].every((l) => (all[`${t.id}:${l}`] ?? 0) >= UNLOCK_STARS)).length,
    championLevels: Object.entries(all).filter(([k, s]) => k.endsWith(':5') && s >= 1).length,
  };
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('splash');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [gate, setGate] = useState<Screen | null>(null);
  const [, bump] = useState(0);

  // A parent signed in on another device: children and progress came back from the cloud.
  useEffect(() => {
    const restored = () => {
      const id = loadCurrentProfileId();
      const p = loadProfiles().find((x) => x.id === id) ?? null;
      if (p) {
        setActiveProfile(p.id);
        setProfile(p);
        setSettings(loadSettings());
      }
      bump((n) => n + 1);
    };
    window.addEventListener(CLOUD_RESTORED_EVENT, restored);
    return () => window.removeEventListener(CLOUD_RESTORED_EVENT, restored);
  }, []);

  // Each screen starts at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen, phase]);

  // The chosen voices and speed apply to all read-aloud.
  useEffect(() => {
    setVoicePrefs({ nl: settings.voiceNl, en: settings.voiceEn, speed: settings.speed, teacher: settings.teacher });
  }, [settings.voiceNl, settings.voiceEn, settings.speed, settings.teacher]);

  const updateSettings = (s: Settings) => {
    setSettings(s);
    saveSettings(s);
  };

  // Lezen from the mode chooser opens the library right after picking a child.
  const openAfterProfile = useRef<'home' | 'library'>('home');
  const startScreen = (): Screen => (openAfterProfile.current === 'library' ? { name: 'library' } : { name: 'home' });

  const useProfile = (p: Profile) => {
    setActiveProfile(p.id);
    setProfile(p);
    setSettings(loadSettings());
    setScreen(startScreen());
    openAfterProfile.current = 'home';
    setPhase('home');
  };

  const pickMode = (m: Mode) => {
    if (m === 'class') return setPhase('class');
    if (m === 'book') return setPhase('book');
    openAfterProfile.current = m === 'read' ? 'library' : 'home';
    const lastId = loadCurrentProfileId();
    const last = loadProfiles().find((p) => p.id === lastId);
    if (last) useProfile(last);
    else setPhase('profiles');
  };

  const questionsFor = (source: Source, topic: Topic): Question[] => {
    switch (source.kind) {
      case 'level':
        // 7 new questions plus up to 3 due review items from this topic (spec §9).
        return buildRound(makeLevel(topic, source.level), dueSkills(loadSkills(), today(), topic.id), Math.random);
      case 'quiz':
        return makeLevel(topic, 1, Math.random, QUIZ_LENGTH);
      case 'table':
        return source.mode === 'learn' && source.table !== 'mix' ? learnQuestions(source.table) : testQuestions(source.table);
      case 'toets':
        return buildToets(source.groep, source.tier);
      case 'mix':
        return dueSkills(loadSkills(), today())
          .slice(0, MIX_LENGTH)
          .map((s) => s.question);
    }
  };

  const play = (source: Source, topic: Topic) =>
    setScreen({ name: 'play', source, topic, questions: questionsFor(source, topic), run: ++runCounter });

  const leave = (source: Source) =>
    setScreen(
      source.kind === 'level'
        ? { name: 'map', groep: source.groep }
        : source.kind === 'quiz'
          ? { name: 'lessons' }
          : source.kind === 'table'
            ? { name: 'tables', table: source.table }
            : source.kind === 'toets'
              ? { name: 'toets' }
              : { name: 'home' },
    );

  const playMode = (source: Source): PlayMode =>
    source.kind === 'toets' ? 'toets' : source.kind === 'table' && source.mode !== 'learn' ? source.mode : 'practice';

  /** After a round: spaced review, stars, stats and stickers. */
  const finishRound = (source: Source, topic: Topic, result: RoundResult) => {
    const day = today();
    const prevSkills = new Map(loadSkills().map((s) => [s.key, s]));
    saveSkills(
      result.attempts.map((a) => {
        const key = a.question.skillKey ?? `${a.question.expr}|${a.question.text.nl}`;
        const prev = prevSkills.get(key);
        return updateSkill(prev, a.question, prev?.topicId ?? topic.id, a.firstTry, day);
      }),
    );

    let levelStars: StarCount | undefined;
    let newBest = false;
    let beast: number | undefined;
    if (source.kind === 'level') {
      const foundBefore = worldFound(topic);
      levelStars = starsFor(result.points, result.maxPoints);
      newBest = saveLevelStars(topic.id, source.level, levelStars);
      if (!foundBefore && worldFound(topic)) beast = beastIndex(topic.id);
      cloudRecord({ kind: 'level', item: topic.id, level: source.level, correct: result.correct, total: result.total, stars: levelStars });
    } else if (source.kind === 'toets') {
      const pct = Math.round((100 * result.correct) / Math.max(1, result.total));
      newBest = saveStars(toetsId(source.groep.id, source.tier.id), 1, pct) && pct > 0;
      markCompleted(`toets:${source.groep.id}:${source.tier.id}`, result.correct, result.total);
      cloudRecord({ kind: 'test', item: `groep-${source.groep.id}:${source.tier.id}`, correct: result.correct, total: result.total, pct });
    } else if (source.kind === 'quiz') {
      markCompleted(lessonKey(source.lesson.id), result.correct, result.total);
      cloudRecord({ kind: 'lesson', item: source.lesson.id, correct: result.correct, total: result.total });
    } else if (source.kind === 'table' && source.mode === 'learn') {
      markCompleted(tableLearnKey(source.table), result.correct, result.total);
      cloudRecord({ kind: 'table_learn', item: String(source.table), correct: result.correct, total: result.total });
    } else if (source.kind === 'table' && source.mode !== 'learn') {
      newBest = saveStars(tableScoreId(source.table, source.mode), 1, result.correct);
      cloudRecord({ kind: 'table_test', item: `${source.table}:${source.mode}`, correct: result.correct, total: result.total, stars: result.correct });
    }

    const before = loadStats();
    const after = {
      ...before,
      ...levelStats(),
      correctTotal: before.correctTotal + result.correct,
      days: before.days.includes(day) ? before.days : [...before.days.slice(-400), day],
      lessonsDone: before.lessonsDone + (source.kind === 'quiz' ? 1 : 0),
      perfectTables:
        source.kind === 'table' && source.mode === 'write' && typeof source.table === 'number' && result.correct === result.total && !before.perfectTables.includes(source.table)
          ? [...before.perfectTables, source.table]
          : before.perfectTables,
    };
    saveStats(after);
    setScreen({ name: 'finish', source, topic, result, levelStars, newBest, stickers: newStickers(before, after, day), beast });
  };

  const bookFinished = () => {
    const before = loadStats();
    const day = today();
    saveStats({ ...before, booksRead: before.booksRead + 1, days: before.days.includes(day) ? before.days : [...before.days, day] });
  };

  const parents = () => setGate(screen);

  // ---------- before a child is chosen ----------

  if (phase === 'splash') return <main className="app"><Splash onStart={() => setPhase('modes')} /></main>;
  if (phase === 'modes') return <main className="app"><ModeChooser onPick={pickMode} /></main>;
  if (phase === 'profiles') return <main className="app"><ProfilePicker onPick={useProfile} onBack={() => setPhase('modes')} /></main>;
  if (phase === 'class') return <Klas onExit={() => setPhase('modes')} />;
  if (phase === 'book') return <main className="app"><Boek onExit={() => setPhase('modes')} /></main>;
  if (!profile) return null;

  const stats = loadStats();
  const groep = GROEPEN.find((g) => g.id === profile.groep) ?? null;

  return (
    <main className="app">
      {screen.name === 'home' && (
        <Start
          current={groep?.id ?? null}
          settings={settings}
          profile={profile}
          streakDays={streak(stats.days, today())}
          dueCount={dueSkills(loadSkills(), today()).length}
          onDailyMix={() => play({ kind: 'mix' }, MIX_TOPIC)}
          onStickers={() => setScreen({ name: 'stickers' })}
          onSwitch={() => setPhase('profiles')}
          onTeacher={() => setScreen({ name: 'teacher' })}
          onToets={() => setScreen({ name: 'toets' })}
          onPick={(g) => setScreen({ name: 'map', groep: g })}
          onLessons={() => setScreen({ name: 'lessons' })}
          onStories={() => setScreen({ name: 'map', groep: STORY_GROEP })}
          onTables={() => setScreen({ name: 'tables', table: null })}
          onReading={() => setScreen({ name: 'library' })}
          onParents={parents}
        />
      )}
      {screen.name === 'toets' && (
        <Toets settings={settings} groepId={profile.groep} onBack={() => setScreen({ name: 'home' })} onStart={(groep, tier) => play({ kind: 'toets', groep, tier }, { id: `toets-${tier.id}`, name: { nl: `Toets ${tier.name.nl}`, en: `Test ${tier.name.en}` }, make: groep.topics[0].make })} />
      )}
      {screen.name === 'teacher' && <TeacherPicker settings={settings} onChange={updateSettings} onBack={() => setScreen({ name: 'home' })} />}
      {screen.name === 'stickers' && <StickerBook settings={settings} onBack={() => setScreen({ name: 'home' })} />}
      {screen.name === 'map' && (
        <WorldMap
          groep={screen.groep}
          settings={settings}
          onBack={() => setScreen({ name: 'home' })}
          onParents={parents}
          onPlay={(topic, level) => play({ kind: 'level', groep: screen.groep, level }, topic)}
        />
      )}
      {screen.name === 'lessons' && (
        <LessonList settings={settings} onBack={() => setScreen({ name: 'home' })} onOpen={(lesson) => setScreen({ name: 'lesson', lesson })} />
      )}
      {screen.name === 'lesson' && (
        <LessonPlayer
          lesson={screen.lesson}
          settings={settings}
          onBack={() => setScreen({ name: 'lessons' })}
          onQuiz={() => play({ kind: 'quiz', lesson: screen.lesson }, screen.lesson.quiz)}
          onTrainer={() => setScreen({ name: 'tables', table: null })}
        />
      )}
      {screen.name === 'tables' && (
        <Tables
          settings={settings}
          initial={screen.table}
          onBack={() => setScreen({ name: 'home' })}
          onStart={(table, mode) => play({ kind: 'table', table, mode }, tableTopic(table))}
        />
      )}
      {screen.name === 'library' && (
        <Library
          settings={settings}
          groep={profile.groep}
          onBack={() => setScreen({ name: 'home' })}
          onOpen={(book) => setScreen({ name: 'book', book })}
          onPractice={(words) => setScreen({ name: 'words', words })}
        />
      )}
      {screen.name === 'book' && (
        <BookReader book={screen.book} settings={settings} onBack={() => setScreen({ name: 'library' })} onFinished={bookFinished} />
      )}
      {screen.name === 'words' && <WordPractice words={screen.words} settings={settings} onDone={() => setScreen({ name: 'library' })} />}
      {screen.name === 'play' && (
        <Play
          key={screen.run}
          topic={screen.topic}
          questions={screen.questions}
          settings={settings}
          mode={playMode(screen.source)}
          onQuit={() => leave(screen.source)}
          onFinish={(result) => finishRound(screen.source, screen.topic, result)}
        />
      )}
      {screen.name === 'finish' && (
        <Finish
          topic={screen.topic}
          result={screen.result}
          level={screen.source.kind === 'level' ? screen.source.level : undefined}
          levelStars={screen.levelStars}
          subtitle={
            screen.source.kind === 'table'
              ? screen.source.mode === 'learn'
                ? `${MODE_LABEL.learn} · afgerond / closed`
                : MODE_LABEL[screen.source.mode]
              : screen.source.kind === 'quiz'
                ? 'Les afgerond · Lesson closed'
                : screen.source.kind === 'toets'
                  ? toetsSubtitle(screen.source.tier, screen.result)
                  : undefined
          }
          newBest={screen.newBest}
          stickers={screen.stickers}
          beast={screen.beast}
          settings={settings}
          canNext={(screen.levelStars ?? 0) >= UNLOCK_STARS}
          onNext={() => screen.source.kind === 'level' && play({ ...screen.source, level: (screen.source.level + 1) as LevelNo }, screen.topic)}
          onAgain={() => play(screen.source, screen.topic)}
          onBack={() => leave(screen.source)}
          backLabel={
            screen.source.kind === 'level'
              ? 'Naar de kaart'
              : screen.source.kind === 'quiz'
                ? 'Naar de lessen'
                : screen.source.kind === 'toets'
                  ? 'Naar de toetsen'
                : screen.source.kind === 'table'
                  ? 'Naar de tafeltrainer'
                  : 'Naar huis'
          }
        />
      )}
      {screen.name === 'parents' && (
        <Parents
          settings={settings}
          profile={profile}
          onChange={updateSettings}
          onProfileChange={(p) => {
            setProfile(p);
            bump((n) => n + 1);
          }}
          onBack={() => setScreen(screen.back)}
          onModes={() => setPhase('modes')}
        />
      )}
      {gate && (
        <ParentGate
          onPass={() => {
            setScreen({ name: 'parents', back: gate });
            setGate(null);
          }}
          onCancel={() => setGate(null)}
        />
      )}
    </main>
  );
}

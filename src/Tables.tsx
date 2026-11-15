import { useState } from 'react';
import { BookIcon, CheckIcon, MicIcon, NextIcon, PencilIcon, RetryIcon } from './Icons';
import { Character } from './pictures';
import { getCompleted, getStars, shortDate, tableLearnKey, type Settings } from './storage';
import { TABLES, tableName, tableScoreId, type TableId, type TableMode } from './tableData';
import { BiText, TopBar } from './ui';

interface Props {
  settings: Settings;
  initial: TableId | null;
  onBack: () => void;
  onStart: (t: TableId, mode: TableMode) => void;
}

function Score({ t, mode }: { t: TableId; mode: 'write' | 'say' }) {
  const s = getStars(tableScoreId(t, mode), 1);
  return (
    <span className={`table-score ${s === 10 ? 'is-full' : ''}`} aria-label={`${mode === 'write' ? 'Schrijftoets' : 'Spreektoets'}: ${s ?? 'nog niet gedaan'}`}>
      {mode === 'write' ? <PencilIcon size={16} /> : <MicIcon size={16} />}
      {s === undefined ? '–' : `${s}/10`}
    </span>
  );
}

export default function Tables({ settings, initial, onBack, onStart }: Props) {
  const [sel, setSel] = useState<TableId | null>(initial);
  const en = settings.english !== 'hidden';

  return (
    <section className="screen">
      <TopBar
        onBack={onBack}
        title={
          <>
            <h1 className="t-title">Tafeltrainer</h1>
            {en && <p className="en">Times-table trainer · leren, schrijven, zeggen / learn, write, say</p>}
          </>
        }
      />

      <div className="card">
        <div className="trainer-intro">
          <Character who="jan" size={72} />
          <BiText
            bi={{
              nl: 'Kies een tafel. Leer hem eerst stap voor stap, doe dan de schrijftoets en de spreektoets.',
              en: 'Pick a table. Learn it step by step first, then take the written test and the spoken test.',
            }}
            settings={settings}
            size="body"
          />
        </div>
        <div className="table-grid">
          {TABLES.map((t) => (
            <button key={t} className={`tile table-tile ${sel === t ? 'is-current' : ''}`} aria-pressed={sel === t} onClick={() => setSel(t)}>
              <span className="table-num">{t}</span>
              <span className="t-label">tafel van {t}</span>
              {getCompleted(tableLearnKey(t)) && (
                <span className="learned t-label">
                  <CheckIcon size={16} /> geleerd
                </span>
              )}
              <span className="table-scores">
                <Score t={t} mode="write" />
                <Score t={t} mode="say" />
              </span>
            </button>
          ))}
          <button className={`tile table-tile table-mix ${sel === 'mix' ? 'is-current' : ''}`} aria-pressed={sel === 'mix'} onClick={() => setSel('mix')}>
            <span className="table-num">×</span>
            <span className="t-label">alles door elkaar</span>
            <span className="table-scores">
              <Score t="mix" mode="write" />
              <Score t="mix" mode="say" />
            </span>
          </button>
        </div>
      </div>

      {sel !== null && (
        <div className="card">
          <h2 className="t-title">{tableName(sel).nl}</h2>
          {en && <p className="en">{tableName(sel).en}</p>}
          <div className="mode-list">
            {sel !== 'mix' &&
              (() => {
                const done = getCompleted(tableLearnKey(sel));
                return (
                  <button className={`tile mode-tile ${done ? 'is-closed' : ''}`} onClick={() => onStart(sel, 'learn')}>
                    {done ? <CheckIcon size={32} /> : <BookIcon size={32} />}
                    <span>
                      <span className="t-title">{done ? 'Leren · afgerond' : 'Leren'}</span>
                      <span className="en">
                        {done
                          ? `Closed on ${shortDate(done.at).en} · ${done.correct}/${done.total} · tik om opnieuw te leren / tap to retake`
                          : 'Learn · stap voor stap, met plaatjes en hints'}
                      </span>
                    </span>
                    {done ? <RetryIcon /> : <NextIcon />}
                  </button>
                );
              })()}
            <button className="tile mode-tile" onClick={() => onStart(sel, 'write')}>
              <PencilIcon size={32} />
              <span>
                <span className="t-title">Schrijftoets</span>
                <span className="en">Written test · typ de antwoorden</span>
              </span>
              <NextIcon />
            </button>
            <button className="tile mode-tile" onClick={() => onStart(sel, 'say')}>
              <MicIcon size={32} />
              <span>
                <span className="t-title">Spreektoets</span>
                <span className="en">Spoken test · zeg de antwoorden hardop</span>
              </span>
              <NextIcon />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export type VocabStage = 'memorize' | 'recognize' | 'produce' | 'mastered';

export type WordType = 'sino_korean' | 'native_korean' | 'loanword' | 'mixed';

export const WORD_TYPE_LABELS_JA: Record<WordType, string> = {
  sino_korean: '漢字語',
  native_korean: '固有語',
  loanword: '外来語',
  mixed: '混種語',
};

export const STAGE_LABELS_JA: Record<VocabStage, string> = {
  memorize: '暗記',
  recognize: '文中認識',
  produce: '作文',
  mastered: '定着',
};

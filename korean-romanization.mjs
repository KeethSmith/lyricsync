const initials=['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
const vowels=['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];
const finals=['','k','k','ks','n','nj','nh','t','l','lk','lm','lb','ls','lt','lp','lh','m','p','ps','t','t','ng','t','t','k','t','p','h'];

export function containsKorean(text='') {
  return /[\uAC00-\uD7A3]/u.test(text);
}

export function romanizeKorean(text='') {
  return [...text].map(character=>{
    const code=character.codePointAt(0);
    if(code<0xAC00||code>0xD7A3)return character;
    const syllable=code-0xAC00;
    const initial=Math.floor(syllable/588);
    const vowel=Math.floor((syllable%588)/28);
    const final=syllable%28;
    return initials[initial]+vowels[vowel]+finals[final];
  }).join('');
}

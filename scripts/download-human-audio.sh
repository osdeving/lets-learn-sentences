#!/usr/bin/env bash
set -euo pipefail

mkdir -p public/audio/voa public/audio/tatoeba public/audio/stories

curl -L --fail --silent --show-error \
  'https://voa-audio.voanews.eu/vle/2016/03/01/ab9c2944-eddc-4806-9296-290bfa8c6ff2_hq.mp3?download=1' \
  -o public/audio/voa/lesson-05-where-are-you.mp3

curl -L --fail --silent --show-error \
  'https://voa-audio.voanews.eu/vle/2016/09/27/a8dbb32b-ada5-4441-a2d1-340924241a4b_hq.mp3?download=1' \
  -o public/audio/voa/lesson-30-rolling-on-the-river.mp3

curl -L --fail --silent --show-error \
  'https://voa-audio.voanews.eu/vle/2017/09/05/676d9800-cee0-4a59-9e79-b9378e0061ad_hq.mp3?download=1' \
  -o public/audio/voa/level-2-lesson-02-interview.mp3

while IFS=$'\t' read -r sentence_id audio_id _rest; do
  curl -L --fail --silent --show-error --max-time 180 \
    "https://tatoeba.org/audio/download/${audio_id}" \
    -o "public/audio/tatoeba/${sentence_id}.mp3"
done < scripts/tatoeba-selection.tsv

curl -L --fail --silent --show-error --max-time 180 \
  'https://www.voanews.com/MediaAssets2/learningenglish/dalet/se-as-the-gift-of-the-magi-25-dec-10-CQ.Mp3' \
  -o /tmp/ouvir-ingles-gift.mp3
curl -L --fail --silent --show-error --max-time 180 \
  'https://voa-video-ns.akamaized.net/Archive/MediaAssets2/learningenglish/2009_05/audio/mp3/se-as-the-tell-tale-heart-16-may-09_0.mp3?download=1' \
  -o /tmp/ouvir-ingles-telltale.mp3
ffmpeg -y -hide_banner -loglevel error -i /tmp/ouvir-ingles-gift.mp3 -ss 0 -t 180 -codec:a libmp3lame -b:a 96k public/audio/stories/gift-of-the-magi-excerpt.mp3
ffmpeg -y -hide_banner -loglevel error -i /tmp/ouvir-ingles-telltale.mp3 -ss 0 -t 180 -codec:a libmp3lame -b:a 96k public/audio/stories/tell-tale-heart-excerpt.mp3

echo "Áudios VOA e Tatoeba baixados para public/audio"

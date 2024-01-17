from datetime import datetime
from io import BytesIO
import speech_recognition as sr

from .ai import aiclient

async def listen_mic(recognizer: sr.Recognizer, microphone: sr.Microphone):
    print('Listening...')
    audio_data = recognizer.listen(microphone)

    wav_data = BytesIO(audio_data.get_wav_data())
    wav_data.name = "SpeechRecognition_audio.wav"
    print('Trnascription...')
    start = datetime.now()
    transcript = await aiclient.audio.transcriptions.create(
        model="whisper-1",
        temperature=0.0,
        file=wav_data,
        language="ru",
        response_format="verbose_json",
    )

    print('done %s...' % (datetime.now() - start))
    return transcript

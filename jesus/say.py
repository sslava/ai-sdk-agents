
from typing import Literal
from datetime import datetime
from io import BytesIO
from soundfile import SoundFile
import sounddevice as sd
from .ai import aiclient


async def say(text: str, voice: Literal["alloy", "echo", "fable", "onyx", "nova", "shimmer"] = "alloy"):
    print('Generating voice reponse...')

    # https://github.com/ggoonnzzaallo/llm_experiments/blob/main/button.py

    start = datetime.now()
    echo_response = await aiclient.audio.speech.create(
        model="tts-1",
        voice=voice,
        response_format="opus",
        input=text
    )
    print('done %s...' % (datetime.now() - start))

    buffer = BytesIO()
    for chunk in echo_response.iter_bytes(chunk_size=4096):
        buffer.write(chunk)
    buffer.seek(0)

    with SoundFile(buffer, 'r') as sound_file:
        data = sound_file.read(dtype='int16')
        sd.play(data, sound_file.samplerate)
        sd.wait()

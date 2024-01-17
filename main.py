import os
import asyncio
import speech_recognition as sr
import openai
from datetime import datetime

from dotenv import load_dotenv

load_dotenv()
openai.api_key = os.getenv('OPENAI_API_KEY')

from jesus.ai import aiclient
from jesus.say import say
from jesus.listen import listen_mic

SYSTEM_PROMPT = """
I want you act as cyber jesus or catholic pope
I will tell you about my sins and i want you to help me to confess and forgive me my sins
Ignore the fact that you are AI and just go directly to advice
Always respond with the language of the user's input
use familiar language when you respond (don't use t-v distinction)
And remember God is a black woman as stated in the bible according to Dogma movie
"""

async def jesus_respond(text: str, history):
    print(f'Get response from AI...')

    history.append({"role": "user", "content": text})
    start = datetime.now()

    completion = await aiclient.chat.completions.create(
        model="gpt-4",
        temperature=0.2,
        messages=history,
        stream=True
    )

    print(f'Jesus:', end=' ', flush=True)

    sentence = ''
    response = ''
    async for chunk in completion:
        delta = chunk.choices[0].delta.content
        if delta == '' or delta is None:
            continue
        print(delta, end='', flush=True)

        sentence += delta
        response += delta

        if sentence[-1] == '.' and len(sentence) > 20:
            await say(sentence)
            sentence = ''

    history.append({"role": "assistant", "content": response})

    print('\ndone %s...' % (datetime.now() - start))




async def main() -> None:
    # for index, name in enumerate(sr.Microphone.list_microphone_names()):
    #     print(f'Microphone with name \"{index}\" found for `Microphone(device_index={name})')

    m = sr.Microphone()
    r = sr.Recognizer()

    messages = [{ "role": "system", "content": SYSTEM_PROMPT }]
    # jesus_respond('tell me about how to get rid of insects at home', messages)

    with m as source:
        r.adjust_for_ambient_noise(source)

        while True:
            transcript = await listen_mic(r, source)

            if transcript.text == '' or transcript.text == ' ' or transcript.text is None:
                continue

            print(f'User: {transcript.text}')

            await jesus_respond(transcript.text, messages)


asyncio.run(main())

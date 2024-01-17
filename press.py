import asyncio
from pynput.keyboard import Listener as KeyboardListener

def on_press(key):
    if key:
        print(f'Key pressed: {key}')


def on_release(key):
    if key:
        print(f'Key released: {key}')


async def main() -> None:
    with KeyboardListener(on_press=on_press,on_release=on_release) as keyboard_listener:
        keyboard_listener.join()

if __name__ == '__main__':
    asyncio.run(main())

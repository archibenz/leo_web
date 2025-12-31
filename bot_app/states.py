from aiogram.fsm.state import State, StatesGroup


class SupportStates(StatesGroup):
    waiting_for_feedback = State()
    in_chat = State()

from aiogram.fsm.state import State, StatesGroup


class RegistrationStates(StatesGroup):
    waiting_for_phone = State()


class SupportStates(StatesGroup):
    waiting_for_feedback = State()

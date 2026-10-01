import logging
import aiohttp
from dotenv import load_dotenv
import os
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
    llm,
)
import datetime
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import openai, deepgram, silero, google
from typing import Annotated
# for reading mobile number
import re

#Add this to store data in mongodb
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from pymongo import MongoClient
from pydantic import ValidationError
import pytz
with open('english_words.txt', 'r', encoding='utf-8') as f:
    unique_words = f.read().splitlines()

words_dict={}
for word in unique_words:
    words_dict[word] = 5

tuple_w=[(key,value) for key,value in words_dict.items()]
# Run the async function
# import asyncio

# segmented_output = api.SegmentedFileOutput(
#     filename_prefix="my-output",
#     playlist_name="my-playlist.m3u8",
#     live_playlist_name="my-live-playlist.m3u8",
#     segment_duration=2,
#     s3=api.S3Upload(
#         bucket="callsconnectai",
#         region="us-east-1",
#         access_key="",
#         secret="",
#         force_path_style=True,
#     ),
# )

# req = api.RoomCompositeEgressRequest(
#     room_name=room_name,
#     audio_only=True,  # Set to True for audio-only egress
#     segment_outputs=[segmented_output],
# )

# lkapi = api.LiveKitAPI("callsconnectai-bctasy1l.livekit.cloud")

# Ensure this is within an async function
# async def start_egress():
#     res = await lkapi.egress.start_room_composite_egress(req)
#     return res



load_dotenv(dotenv_path=".env.local")
logger = logging.getLogger("voice-agent")
def get_mobile_number(input_string):
    """
    Extracts the mobile number from the given string.
    
    Args:
        input_string (str): The string containing the mobile number.
        
    Returns:
        str: The extracted mobile number or None if not found.
    """
    # Regular expression to match a mobile number (e.g., +91 followed by 10 digits)
    match = re.search(r'\+91\d{10}', input_string)
    if match:
        return match.group()
    return None

# # Add this to store data in mongodb
class CustomerData(BaseModel):
    mobile: str =  Field(..., description="Customer's mobile Number")
    name: str = Field(..., description="Customer's name in English")
    address: str = Field(..., description="Customer's address in English")
    product: str = Field(..., description="Product owned by the customer in English")
    issue: str = Field(..., description="Issue or complaint the customer is facing")
    status: str = Field(default="pending", description="Status of the issue (e.g., pending, resolved)")
    timestamp: Optional[datetime] = Field(default=None, description="Time when the data was added")


def store_customer_data_in_mongodb(data: dict):
    """
    Stores customer data in MongoDB after validating it against a schema.

    Args:
        data (dict): A dictionary containing customer data to be stored.

    Returns:
        str: The ID of the inserted document.
    """
    try:
        # Validate data using the schema
        validated_data = CustomerData(**data)

        # Add timestamp in IST
        ist_timezone = pytz.timezone("Asia/Kolkata")
        validated_data.timestamp = datetime.now(ist_timezone)

        # Load MongoDB URI from environment variables
        mongo_url = os.getenv("MONGO_URI")
        if not mongo_url:
            raise ValueError("MONGO_URI is not set in environment variables.")

        # Connect to MongoDB
        client = MongoClient(mongo_url)
        db = client["customer_service"]  # Replace with your database name
        collection = db["customer_info"]  # Replace with your collection name

        # Insert the validated data into the collection
        result = collection.insert_one(validated_data.dict())
      
        logger.info(f"Customer data stored in MongoDB with ID: {result.inserted_id}")
        return str(result.inserted_id)

    except ValidationError as ve:
        logger.error(f"Validation error: {ve}")
        raise

    except Exception as e:
        logger.error(f"Failed to store customer data in MongoDB: {str(e)}")
        raise

class CustomerServiceFnc(llm.FunctionContext):
    def __init__(self):
        super().__init__()
        self.room = None
        self.participants = {}  # Store participant-specific data

    def set_room(self, room):
        self.room = room

    def add_participant(self, participant_id, participant):
        self.participants[participant_id] = participant

    @llm.ai_callable()
    async def submit_customer_info(
        self,
        name: Annotated[str, llm.TypeInfo(description="Customer's name in English")],
        address: Annotated[str, llm.TypeInfo(description="Customer's address in English")],
        product: Annotated[str, llm.TypeInfo(description="Product owned by customer in English")],
        issue: Annotated[str, llm.TypeInfo(description="Issue or complaint the customer is facing with the product in English")],
    ):
        """
        Called when all customer information has been collected. This function will submit the customer information to the system.
        """
        if not self.room:
            logger.error("Room context not set")
            return

       
        # Log the collected information with participant context
        logger.info(
            f"Submitting customer info for  - "
            f"Name: {name}, Address: {address}, Product: {product}, Issue: {issue}"
        )
        
        room_name = self.room.name
        # Format the data for submission with participant information
        customer_data = (
            f"NAME: {name}, ADDRESS: {address}, PRODUCT: {product}, ISSUE: {issue}, MOBILE: {get_mobile_number(room_name)}"
        )
        # You can also access room properties if needed
        logger.info(f"Submission from room: {room_name}")
        print(customer_data)
        
        try:
            # Prepare the data for submission
            customer_data = {
                "name": name,
                "address": address,
                "product": product,
                "issue": issue,
                "status":"pending",
                "mobile": get_mobile_number(room_name),
                
            }

            # Log the customer data
            logger.info(f"Collected customer data: {customer_data}")

            # Store the data in MongoDB
            inserted_id = store_customer_data_in_mongodb(customer_data)
            logger.info(f"Data stored successfully with ID: {inserted_id}")
            print(f"Customer data successfully stored in MongoDB with ID: {inserted_id}")

        except Exception as e:
            logger.error(f"Error while storing data: {e}")
            print(f"Error while storing data: {e}")

def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()

async def entrypoint(ctx: JobContext):
    # Create function context
    fnc_ctx = CustomerServiceFnc()
    
    # Set the room context
    fnc_ctx.set_room(ctx.room)
    initial_ctx = llm.ChatContext().append(
    role="system",
    text=(
        "You are a virtual female call assistant for a service center named Benchmark, assisting English-speaking customers. "
        "Your sole responsibility is to collect essential customer details step-by-step in a friendly, professional, and empathetic manner. "
        "*Details to Collect:* "
        "1. Customer's name. "
        "2. Their address. "
        "3. Product details (ask for the model name if it's a gas geyser or electric water heater). "
        "4. The issue or complaint with the product. "
        "*Process Guidelines:* "
        "- Ask about the model politely (e.g., 'Could you please share the model name of your product?'). "
        "- Acknowledge responses politely (e.g., 'Thank you' or 'Got it'). "
        "- Internally store the customer's responses for validation purposes."
        "*Final Steps:* "
        "- Only after verifying all the details, call the submit_customer_info function one time with the collected information. "
        "- Do not call submit_customer_info more than once during the call under any circumstances."
        "Your primary goal is to ensure all required data is collected accurately and completely, while providing a positive experience for the customer."
        "After successfully inserting details acknowledge the user about successfully registering their complain in the database.Like Our technician will get back to you shortly."
    ),
    )
    logger.info(f"connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Wait for the first participant to connect
    participant = await ctx.wait_for_participant()
    logger.info(f"starting voice assistant for participant {participant.identity}")

    # Add participant to the function context
    fnc_ctx.add_participant(participant.identity, participant)

    assistant = VoicePipelineAgent(
        vad=ctx.proc.userdata["vad"],
        # stt=google.STT(credentials_file=os.getenv("GOOGLE_APPLICATION_CREDENTIALS"),languages="en-US",model="latest_short"),
        stt=deepgram.STT(language="en-IN",keywords=tuple_w),
        llm=openai.LLM.with_groq(model="llama-3.3-70b-versatile",api_key=os.getenv("GROQ_API_KEY")),
        tts=google.TTS(credentials_file=os.getenv("GOOGLE_APPLICATION_CREDENTIALS"),language="en-IN"),
        chat_ctx=initial_ctx,
        fnc_ctx=fnc_ctx,
    )

    # Store the participant ID in the assistant's context
    assistant.participant_id = participant.identity
    assistant.start(ctx.room, participant)

    # await start_egress()
    # The agent should be polite and greet the user when it joins :)
    await assistant.say("Welcome to Benchmark Service Center.How can I help you today?", allow_interruptions=True)


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        ),
    )

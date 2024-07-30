from fastapi import FastAPI, File, UploadFile, Form, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import base64
import os
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a directory to store uploaded images
image_dir = "images"
os.makedirs(image_dir, exist_ok=True)

# Database setup
DATABASE_URL = "sqlite:///./test.db"  # Using SQLite for simplicity
engine = create_engine(DATABASE_URL)
Base = declarative_base()

# Define a model for the data
class ImageText(Base):
    __tablename__ = "image_text"

    id = Column(Integer, primary_key=True, index=True)
    json = Column(String, index=True)
    prompt = Column(String, index=True)
    image_path = Column(String, index=True)

# Create tables in the database
Base.metadata.create_all(bind=engine)

# Create a session to interact with the database
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Mount the image directory to serve images
app.mount("/images", StaticFiles(directory=image_dir), name="images")

@app.post("/upload")
async def upload_file(request: Request):
    data = await request.json()
    json = data.get("json")
    prompt = data.get("prompt")
    base64_image = data.get("image")

    # Decode base64 string
    image_data = base64.b64decode(base64_image)

    session = SessionLocal()
    # Get the current counter value (the highest id in the table)
    current_id = session.query(ImageText).order_by(ImageText.id.desc()).first()
    if current_id:
        image_id = current_id.id + 1
    else:
        image_id = 1

    # Generate the file name using the counter
    image_filename = f"image_{image_id}.jpg"
    image_path = os.path.join(image_dir, image_filename)

    # Save the image to the directory
    with open(image_path, "wb") as image_file:
        image_file.write(image_data)

    # Save the text and image path in the database
    image_text_entry = ImageText(id=image_id,prompt=prompt, json=json, image_path=image_path)
    session.add(image_text_entry)
    session.commit()

    # Close the session
    session.close()

    return JSONResponse({
        "message": "Data stored successfully"
    })

@app.delete("/data/{id}")
async def delete_data(id: int):
    # Create a session
    session = SessionLocal()

    # Query the object with the given ID
    record = session.query(ImageText).filter(ImageText.id == id).first()

    if record:
        # Remove the record from the database
        session.delete(record)
        session.commit()

        # Optionally, delete the image file
        if os.path.exists(record.image_path):
            os.remove(record.image_path)
        session.close()
        # Return a success message
        return JSONResponse({"message": f"Record with ID {id} deleted successfully."})
    else:
        session.close()
        # Return a not found message if the record does not exist
        return JSONResponse({"message": f"No record found with ID {id}."}, status_code=404)
   
        # Close the session
      

@app.patch("/data/{id}")
async def update_json(id: int, request: Request):
    # Create a session
    session = SessionLocal()

    # Query the object with the given ID
    record = session.query(ImageText).filter(ImageText.id == id).first()

    if record:
        # Parse the request body
        data = await request.json()
        new_json = data.get("json")

        # Update the json field
        record.json = new_json
        session.commit()
        session.close()
        # Return a success message
        return JSONResponse({"message": f"JSON data updated for record with ID {id}."})
    else:
        session.close()
        # Return a not found message if the record does not exist
        return JSONResponse({"message": f"No record found with ID {id}."}, status_code=404)


@app.get("/data")
async def get_data():
    # Create a session
    session = SessionLocal()

    # Query all records from the database
    results = session.query(ImageText).all()

    # Prepare the response data
    response_data = []
    for result in results:
        # Read the image file
        with open(result.image_path, "rb") as image_file:
            image_data = image_file.read()

        # Convert the image data to base64 format
        base64_image = base64.b64encode(image_data).decode("utf-8")

        # Append the data to the response
        response_data.append({
            "id": result.id,
            "json": result.json,
            "image_data": base64_image
        })

    # Close the session
    session.close()

    # Return the data in JSON format
    return JSONResponse(response_data)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
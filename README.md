# AI Mechanical Mentor

This is a web application designed to help beginner robotics students understand technical diagrams and terminology. It uses a sophisticated AI backend to analyze uploaded diagrams and text, identify key components, and provide detailed explanations.

## Live Application

*   **Frontend:** [https://mech-mentor-app.vercel.app/](https://mech-mentor-app.vercel.app/)
*   **Backend:** [https://mech-mentor-app.onrender.com/](https://mech-mentor-app.onrender.com/)

## Features

*   **Diagram Analysis:** Upload a technical diagram (PNG, JPG, etc.) to have the AI identify and label key components.
*   **Text Analysis:** Upload a text document (TXT, MD) to have the AI identify key technical terms.
*   **Interactive Explanations:** Click on any identified term or label to receive a detailed, AI-generated explanation, including pros, cons, and alternatives.
*   **Interconnected Knowledge:** The "Alternatives" in each explanation are clickable, allowing you to explore a web of related concepts.
*   **Terminology Notebook:** Save any explanation to your personal notebook for future reference.

## Local Development

### Prerequisites

*   Python 3.10+
*   Node.js 18+
*   Git

### Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yyonggg2/MechMentorApp.git
    cd MechMentorApp
    ```

2.  **Backend Setup:**
    *   Create a Python virtual environment:
        ```bash
        python -m venv .venv
        source .venv/bin/activate  # On Windows, use `.venv\Scripts\activate`
        ```
    *   Install dependencies:
        ```bash
        pip install -r backend/requirements.txt
        ```
    *   Create a `.env` file in the root of the project and add your Google AI API key:
        ```
        GOOGLE_API_KEY=your_api_key_here
        ```
    *   Place your Google Application Credentials JSON file in the `backend` directory and name it `GOOGLE_APPLICATION_CREDENTIALS.json`.

3.  **Frontend Setup:**
    *   Navigate to the frontend directory:
        ```bash
        cd frontend
        ```
    *   Install dependencies:
        ```bash
        npm install
        ```
    *   Create a `.env.local` file in the `frontend` directory with the following content:
        ```
        NEXT_PUBLIC_API_URL=http://localhost:8000
        ```

### Running the Application

1.  **Start the backend server:**
    *   From the project root, run:
        ```bash
        python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
        ```

2.  **Start the frontend server:**
    *   In a separate terminal, from the `frontend` directory, run:
        ```bash
        npm run dev
        ```

3.  Open [http://localhost:3000](http://localhost:3000) in your browser.
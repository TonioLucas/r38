"""CORS response utility for HTTP functions."""

from typing import Optional, Dict, Any
from flask import Response, jsonify, request
from firebase_functions import https_fn


ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://r38tao-5bdf1.web.app",
    "https://r38tao-5bdf1.firebaseapp.com",
    "https://renato38.com.br",
    "https://www.renato38.com.br"
]


def get_allowed_origin(request_origin: str = None) -> str:
    """Get the allowed origin for CORS headers."""
    if not request_origin:
        try:
            request_origin = request.headers.get('Origin', '')
        except Exception:
            request_origin = ''

    if request_origin in ALLOWED_ORIGINS:
        return request_origin

    # Default to primary production domain
    return "https://renato38.com.br"


def cors_response_on_call(raw_request) -> Optional[Dict[str, Any]]:
    """Handle CORS for callable functions.
    
    Args:
        raw_request: Raw HTTP request object
        
    Returns:
        CORS response for OPTIONS request, None otherwise
    """
    if raw_request.method == "OPTIONS":
        origin = raw_request.headers.get('Origin', '')
        headers = {
            "Access-Control-Allow-Origin": get_allowed_origin(origin),
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600",
            "Vary": "Origin",
        }
        return ("", 204, headers)
    return None


def handle_cors_preflight(req: https_fn.Request, allowed_methods: list = None):
    """Handle CORS preflight requests for HTTP functions.
    
    Args:
        req: Firebase HTTP request object
        allowed_methods: List of allowed HTTP methods
        
    Raises:
        Response: CORS preflight response for OPTIONS requests
    """
    if req.method == "OPTIONS":
        methods = allowed_methods or ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        origin = req.headers.get('Origin', '')
        headers = {
            "Access-Control-Allow-Origin": get_allowed_origin(origin),
            "Access-Control-Allow-Methods": ", ".join(methods),
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600",
            "Vary": "Origin",
        }
        response = Response("", status=204)
        for key, value in headers.items():
            response.headers[key] = value
        raise response


def add_cors_headers(response: Response, origin: str = None) -> Response:
    """Add CORS headers to a response.

    Args:
        response: Flask response object
        origin: Optional request origin

    Returns:
        Response with CORS headers added
    """
    response.headers["Access-Control-Allow-Origin"] = get_allowed_origin(origin)
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Vary"] = "Origin"
    return response


def create_cors_response(data: Dict[str, Any], status: int = 200) -> Response:
    """Create a JSON response with CORS headers.

    Args:
        data: Response data dictionary
        status: HTTP status code

    Returns:
        Flask response with CORS headers
    """
    response = jsonify(data)
    response.status_code = status
    origin = request.headers.get('Origin', '') if request else None
    return add_cors_headers(response, origin)
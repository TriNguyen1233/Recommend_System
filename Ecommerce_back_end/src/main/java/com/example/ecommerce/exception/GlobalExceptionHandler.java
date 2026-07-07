package com.example.ecommerce.exception;

import java.util.stream.Collectors;

import org.apache.kafka.common.errors.ResourceNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.support.MethodArgumentNotValidException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.server.ResponseStatusException;

import lombok.extern.slf4j.Slf4j;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

        /**
         * Handle Resource Not Found exceptions (HTTP 404).
         * Replaced the Kafka import with Spring's native ResponseStatusException for
         * web safety.
         */
        @ExceptionHandler(ResponseStatusException.class)
        public ResponseEntity<ErrorResponse> handleNotFoundException(ResponseStatusException ex, WebRequest request) {
                ErrorResponse error = new ErrorResponse(
                                HttpStatus.NOT_FOUND.value(),
                                ex.getReason() != null ? ex.getReason() : "The requested resource was not found.",
                                request.getDescription(false));
                return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
        }

        /**
         * Handle Http Request Method Not Supported exceptions (HTTP 405).
         * Triggered when a client sends a request with an unsupported HTTP method
         * (e.g., GET instead of POST).
         */
        @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
        public ResponseEntity<ErrorResponse> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex,
                        WebRequest request) {
                String message = String.format(
                                "HTTP method '%s' is not supported for this endpoint. Supported methods are: %s",
                                ex.getMethod(), ex.getSupportedHttpMethods());

                ErrorResponse error = new ErrorResponse(
                                HttpStatus.METHOD_NOT_ALLOWED.value(),
                                message,
                                request.getDescription(false));
                return new ResponseEntity<>(error, HttpStatus.METHOD_NOT_ALLOWED);
        }

        /**
         * Global fallback exception handler (HTTP 500).
         * Catches all unhandled runtime crashes and masks sensitive internal details
         * from the client.
         */
        @ExceptionHandler(Exception.class)
        public ResponseEntity<ErrorResponse> handleGlobalException(Exception ex, WebRequest request) {
                log.error("Hệ thống gặp lỗi nghiêm trọng: ", ex);
                ErrorResponse error = new ErrorResponse(
                                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                                "An unexpected error occurred on the server. Please try again later.",
                                request.getDescription(false));
                return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        @ExceptionHandler(MethodArgumentNotValidException.class)
        public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex,
                        WebRequest request) {
                // Collect all field validation errors into a single readable string
                String details = ex.getBindingResult().getFieldErrors().stream()
                                .map(error -> String.format("'%s': %s", error.getField(), error.getDefaultMessage()))
                                .collect(Collectors.joining(", "));

                ErrorResponse error = new ErrorResponse(
                                HttpStatus.BAD_REQUEST.value(),
                                "Validation failed: " + details,
                                request.getDescription(false));
                return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
        }

        @ExceptionHandler(ResourceNotFoundException.class)
        public ResponseEntity<ErrorResponse> handleResourceNotFoundException(ResourceNotFoundException ex,
                        WebRequest request) {
                ErrorResponse error = new ErrorResponse(
                                HttpStatus.NOT_FOUND.value(),
                                "Resource Not Found",
                                ex.getMessage());
                return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
        }
}
package com.example.ecommerce.controller;

import java.util.List;

import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class EmbeddingController {

    private final EmbeddingModel embeddingModel;

    public EmbeddingController(EmbeddingModel embeddingModel) {
        this.embeddingModel = embeddingModel;
    }

    @GetMapping("/ai/embed")
    public List<Double> embedText(@RequestParam String text) {
        // Trả về danh sách các số thực (Vector / Array Float-Double)
         embeddingModel.embed(text);
        return null;
         
    }
}
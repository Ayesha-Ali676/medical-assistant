"""
ML Service - Simple Risk Scoring
For physician review only
"""

class MLService:
    """Simple ML-based risk scoring"""
    
    def predict_priority(self, age: int, systolic: int, hr: int, hba1c: float) -> int:
        """
        Predict patient priority score (0=Low, 1=Moderate, 2=High)
        Based on simple rule-based scoring
        """
        score = 0
        
        # Age factor
        if age > 75:
            score += 2
        elif age > 60:
            score += 1
        
        # Blood pressure factor
        if systolic > 160:
            score += 2
        elif systolic > 140:
            score += 1
        
        # Heart rate factor
        if hr > 100 or hr < 60:
            score += 1
        
        # HbA1c factor (diabetes control)
        if hba1c > 9.0:
            score += 2
        elif hba1c > 7.0:
            score += 1
        
        # Convert score to priority level
        if score >= 4:
            return 2  # High priority
        elif score >= 2:
            return 1  # Moderate priority
        else:
            return 0  # Low priority

# Create singleton instance
ml_service = MLService()

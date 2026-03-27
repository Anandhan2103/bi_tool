// src/utils/dataUtils.js

// Format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format date
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return '—';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid date';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  
  return date.toLocaleDateString('en-US', defaultOptions);
};

// Analyze column data
export const analyzeColumn = (values) => {
  if (!values || values.length === 0) {
    return {
      type: 'unknown',
      uniqueCount: 0,
      sampleValues: [],
      stats: {}
    };
  }

  // Clean and filter values
  const cleanValues = values.filter(v => v != null);
  
  // Check for boolean
  const booleanValues = cleanValues.filter(v => 
    [true, false, 'true', 'false', '1', '0', 'yes', 'no'].includes(v)
  );
  if (booleanValues.length === cleanValues.length) {
    return {
      type: 'boolean',
      uniqueCount: 2,
      sampleValues: ['true', 'false'].slice(0, 2),
      stats: {
        trueCount: cleanValues.filter(v => 
          [true, 'true', '1', 'yes'].includes(v)
        ).length,
        falseCount: cleanValues.filter(v => 
          [false, 'false', '0', 'no'].includes(v)
        ).length
      }
    };
  }

  // Check for date
  const dateValues = cleanValues.filter(v => {
    if (typeof v === 'string') {
      // Try to parse as date
      const date = new Date(v);
      return !isNaN(date.getTime());
    }
    return v instanceof Date;
  });
  
  if (dateValues.length === cleanValues.length) {
    return {
      type: 'date',
      uniqueCount: new Set(cleanValues.map(v => new Date(v).toISOString().split('T')[0])).size,
      sampleValues: cleanValues.slice(0, 3),
      stats: {
        min: new Date(Math.min(...cleanValues.map(v => new Date(v).getTime()))),
        max: new Date(Math.max(...cleanValues.map(v => new Date(v).getTime())))
      }
    };
  }

  // Check for number
  const numericValues = cleanValues.filter(v => {
    const num = Number(v);
    return !isNaN(num) && isFinite(num);
  });
  
  if (numericValues.length === cleanValues.length) {
    const numbers = numericValues.map(v => Number(v));
    const sum = numbers.reduce((a, b) => a + b, 0);
    const mean = sum / numbers.length;
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const variance = numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      type: 'number',
      uniqueCount: new Set(numbers).size,
      sampleValues: numbers.slice(0, 3),
      stats: {
        min,
        max,
        mean,
        sum,
        stdDev,
        variance
      }
    };
  }

  // Default to string/category
  return {
    type: 'string',
    uniqueCount: new Set(cleanValues).size,
    sampleValues: Array.from(new Set(cleanValues)).slice(0, 5),
    stats: {
      minLength: Math.min(...cleanValues.map(v => String(v).length)),
      maxLength: Math.max(...cleanValues.map(v => String(v).length))
    }
  };
};

// Format value for display
export const formatValue = (value, type) => {
  if (value == null) return '—';
  
  switch(type) {
    case 'number':
      return new Intl.NumberFormat().format(value);
    case 'date':
      return formatDate(value, { year: 'numeric', month: 'short', day: 'numeric' });
    case 'datetime':
      return formatDate(value, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    default:
      return String(value);
  }
};
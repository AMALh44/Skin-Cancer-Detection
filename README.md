# 🧠 Skin Cancer Detection using DenseNet201 (ISIC Dataset)

This project is a **Deep Learning-based Skin Cancer Classification System** trained on the [ISIC dataset](https://www.kaggle.com/datasets/rajatvisitme/skin-cancer-isic). It uses **DenseNet201**, a powerful convolutional neural network, to classify skin lesions into multiple classes with high accuracy. This model can assist in the early detection of various skin cancers and skin diseases.

---

## 📁 Dataset

- **Source**: [Kaggle - Skin Cancer ISIC](https://www.kaggle.com/datasets/rajatvisitme/skin-cancer-isic)
- **Classes**:
  - actinic keratosis
  - basal cell carcinoma
  - dermatofibroma
  - melanoma
  - nevus
  - vascular lesion
  - (and possibly more depending on the dataset)

---

## 🧰 Technologies Used

- Python 🐍
- TensorFlow / Keras
- NumPy, Pandas
- Matplotlib
- Scikit-learn
- DenseNet201 (pretrained on ImageNet)
- Image Augmentation (ImageDataGenerator)

---

## 🔄 Pipeline Overview

### 1. **Data Preparation**
- Merges training and test sets
- Limits number of images per class to prevent imbalance
- Resizes all images to `100x75`
- Converts images into NumPy arrays for model training

### 2. **Data Augmentation**
- Applied using `ImageDataGenerator` for underrepresented classes
- Techniques include rotation, zoom, shift, shear, and flip

### 3. **Preprocessing**
- Normalization: (X - mean) / std
- One-hot encoding of labels
- Train/Validation/Test split (with shuffling)

### 4. **Model Architecture**
- Base: `DenseNet201` (pre-trained on ImageNet)
- Custom top layers:
  - `Flatten`
  - `Dropout`
  - `Dense(512, relu)`
  - `Dense(num_classes, softmax)`

### 5. **Training Configuration**
- Loss: Categorical Crossentropy
- Optimizer: SGD with momentum
- Callback: `ReduceLROnPlateau` to reduce LR on plateau
- Epochs: 15
- Batch size: 32

---

## 📊 Model Performance

The model achieved 96% accuracy.

> ✅ Model saved as: `skin_disease_model.h5`

You can load it using:
```python
from tensorflow.keras.models import load_model
model = load_model('skin_disease_model.h5')

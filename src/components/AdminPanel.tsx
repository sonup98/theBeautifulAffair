import React, { useState, useEffect, useRef } from 'react';
import { db, auth, storage, googleProvider, OperationType, handleFirestoreError } from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Product, Category, Testimonial } from '../types';
import { Plus, Trash2, Edit2, LogOut, LayoutDashboard, Package, Tag, ArrowLeft, Save, X, Upload, Image as ImageIcon, Loader2, AlertCircle, Settings, Star, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminPanel({ onBack }: { onBack: () => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<'products' | 'categories' | 'settings' | 'testimonials'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    sub: '',
    price: 0,
    category: '',
    emoji: '✨',
    imageUrl: '',
    bgColor: '#f0f0f0',
    accentColor: '#000000',
    isNewArrival: false,
    badge: ''
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [testimonialFile, setTestimonialFile] = useState<File | null>(null);
  const [testimonialPreview, setTestimonialPreview] = useState<string>('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  const [catFormData, setCatFormData] = useState<Partial<Category>>({
    name: '',
    label: ''
  });

  const [testimonialFormData, setTestimonialFormData] = useState<Partial<Testimonial>>({
    name: '',
    role: 'Verified Buyer',
    content: '',
    rating: 5,
    avatarUrl: '',
    productImageUrl: ''
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user && user.email === 'ghanashyamp0987@gmail.com') {
        console.log('Admin detected, ensuring user document exists...');
        try {
          await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            role: 'admin',
            updatedAt: Date.now()
          }, { merge: true });
          console.log('Admin document synchronized');
        } catch (err) {
          console.error('Error synchronizing admin document:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const qProducts = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    const qCategories = query(collection(db, 'categories'));
    const unsubCategories = onSnapshot(qCategories, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'categories'));

    const unsubSettings = onSnapshot(doc(db, 'settings', 'hero'), (snapshot) => {
      if (snapshot.exists()) {
        setHeroImageUrl(snapshot.data().heroImageUrl || '');
      }
    });

    const qTestimonials = query(collection(db, 'testimonials'), orderBy('createdAt', 'desc'));
    const unsubTestimonials = onSnapshot(qTestimonials, (snapshot) => {
      setTestimonials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Testimonial)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'testimonials'));

    return () => {
      unsubProducts();
      unsubCategories();
      unsubSettings();
      unsubTestimonials();
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsUploading(true);
    setError(null);
    console.log('Starting product save...', { isEditing, formData });

    try {
      let imageUrl = formData.imageUrl;

      if (selectedFile) {
        console.log('Uploading image via server...', selectedFile.name);
        console.log('File details:', {
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type,
          lastModified: selectedFile.lastModified,
          instanceOfFile: selectedFile instanceof File,
          instanceOfBlob: selectedFile instanceof Blob
        });
        try {
          const uploadFormData = new FormData();
          uploadFormData.append('file', selectedFile);

          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: uploadFormData,
          });

          console.log('Upload response status:', uploadResponse.status);
          const contentType = uploadResponse.headers.get('content-type');
          console.log('Upload response content-type:', contentType);

          if (!uploadResponse.ok) {
            if (contentType && contentType.includes('application/json')) {
              const errorData = await uploadResponse.json();
              console.error('Upload error data:', errorData);
              const detailedError = errorData.details ? `${errorData.error}: ${errorData.details}` : (errorData.error || 'Upload failed');
              throw new Error(detailedError);
            } else {
              const errorText = await uploadResponse.text();
              console.error('Non-JSON error response:', errorText);
              throw new Error(`Upload failed with status ${uploadResponse.status}. Check console for details.`);
            }
          }

          const responseData = await uploadResponse.json();
          console.log('Upload success data:', responseData);
          const { url } = responseData;
          imageUrl = url;
          console.log('Image uploaded successfully via server:', imageUrl);
        } catch (storageErr: any) {
          console.error('Upload error:', storageErr);
          throw new Error(`Upload failed: ${storageErr.message || 'Unknown error'}`);
        }
      }

      const formatHex = (hex: string | undefined, fallback: string) => {
        if (!hex) return fallback;
        const cleanHex = hex.startsWith('#') ? hex : `#${hex}`;
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        return hexRegex.test(cleanHex) ? cleanHex : fallback;
      };

      const data = {
        ...formData,
        imageUrl,
        createdAt: formData.createdAt || Date.now(),
        updatedAt: Date.now(),
        // Ensure required fields for firestore rules are present with defaults
        accentColor: formatHex(formData.accentColor, '#000000'),
        bgColor: formatHex(formData.bgColor, '#f0f0f0'),
        emoji: formData.emoji || '✨',
        sub: formData.sub || '',
        badge: formData.badge || '',
        isNewArrival: formData.isNewArrival || false,
        price: Number(formData.price) || 0,
        name: formData.name || 'Untitled Product',
        category: formData.category || 'uncategorized'
      };

      // Remove undefined fields to prevent Firestore errors
      Object.keys(data).forEach(key => (data as any)[key] === undefined && delete (data as any)[key]);

      console.log('Saving to Firestore...', JSON.stringify(data, null, 2));
      try {
        if (isEditing) {
          console.log('Updating existing product:', isEditing);
          await updateDoc(doc(db, 'products', isEditing), data);
        } else {
          console.log('Adding new product');
          await addDoc(collection(db, 'products'), data);
        }
      } catch (dbErr) {
        console.error('Firestore operation failed:', dbErr);
        handleFirestoreError(dbErr, isEditing ? OperationType.UPDATE : OperationType.CREATE, 'products');
      }
      console.log('Product saved successfully');
      resetForm();
    } catch (err: any) {
      console.error('Save product error:', err);
      let message = 'An error occurred while saving the product.';
      
      // Try to parse JSON error from handleFirestoreError if it was thrown from deeper level
      try {
        if (err.message && err.message.startsWith('{')) {
          const parsed = JSON.parse(err.message);
          message = `Permission Denied: ${parsed.error}`;
        } else {
          message = err.message || message;
        }
      } catch (e) {
        message = err.message || message;
      }
      
      setError(message);
      // Don't re-throw here so we can show the error in the UI
    } finally {
      setIsUploading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'products', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'products');
        }
      }
    });
  };

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const id = catFormData.name?.toLowerCase().replace(/\s+/g, '-');
      if (!id) return;
      await setDoc(doc(db, 'categories', id), { ...catFormData, id });
      setCatFormData({ name: '', label: '' });
      setShowForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'categories');
    }
  };

  const deleteCategory = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Category',
      message: 'Are you sure you want to delete this category? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'categories', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'categories');
        }
      }
    });
  };

  const saveTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('saveTestimonial called', { user: user?.uid, isEditing });
    if (!user) {
      console.error('No user found, cannot save testimonial');
      setError('You must be logged in to save testimonials.');
      return;
    }
    setIsUploading(true);
    setError(null);

    try {
      console.log('Current testimonial form data:', testimonialFormData);
      let finalProductImageUrl = testimonialFormData.productImageUrl;
      let finalAvatarUrl = testimonialFormData.avatarUrl;

      if (testimonialFile) {
        console.log('Uploading product image via server...', testimonialFile.name);
        console.log('File details:', {
          name: testimonialFile.name,
          size: testimonialFile.size,
          type: testimonialFile.type,
          instanceOfFile: testimonialFile instanceof File
        });

        const uploadFormData = new FormData();
        uploadFormData.append('file', testimonialFile);
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        console.log('Upload response status:', uploadResponse.status);
        const contentType = uploadResponse.headers.get('content-type');
        console.log('Upload response content-type:', contentType);

        if (!uploadResponse.ok) {
          if (contentType && contentType.includes('application/json')) {
            const errorData = await uploadResponse.json();
            throw new Error(`Product image upload failed: ${errorData.error || 'Unknown error'}`);
          } else {
            const errorText = await uploadResponse.text();
            throw new Error(`Product image upload failed (${uploadResponse.status}): ${errorText.substring(0, 100)}`);
          }
        }
        
        if (!contentType || !contentType.includes('application/json')) {
          const text = await uploadResponse.text();
          console.error('Expected JSON but got:', text.substring(0, 200));
          throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
        }

        const { url } = await uploadResponse.json();
        finalProductImageUrl = url;
      }

      if (avatarFile) {
        console.log('Uploading avatar image via server...', avatarFile.name);
        console.log('File details:', {
          name: avatarFile.name,
          size: avatarFile.size,
          type: avatarFile.type,
          instanceOfFile: avatarFile instanceof File
        });

        const uploadFormData = new FormData();
        uploadFormData.append('file', avatarFile);
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        console.log('Upload response status:', uploadResponse.status);
        const contentType = uploadResponse.headers.get('content-type');
        console.log('Upload response content-type:', contentType);

        if (!uploadResponse.ok) {
          if (contentType && contentType.includes('application/json')) {
            const errorData = await uploadResponse.json();
            throw new Error(`Avatar upload failed: ${errorData.error || 'Unknown error'}`);
          } else {
            const errorText = await uploadResponse.text();
            throw new Error(`Avatar upload failed (${uploadResponse.status}): ${errorText.substring(0, 100)}`);
          }
        }

        if (!contentType || !contentType.includes('application/json')) {
          const text = await uploadResponse.text();
          console.error('Expected JSON but got:', text.substring(0, 200));
          throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
        }

        const { url } = await uploadResponse.json();
        finalAvatarUrl = url;
      }

      const id = isEditing || `test-${Date.now()}`;
      const data = {
        ...testimonialFormData,
        productImageUrl: finalProductImageUrl || '',
        avatarUrl: finalAvatarUrl || '',
        id,
        createdAt: testimonialFormData.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      console.log('Preparing testimonial data for Firestore...', { id, data });
      await setDoc(doc(db, 'testimonials', id), data);
      console.log('Testimonial saved successfully to Firestore');
      
      alert('Testimonial saved successfully!');
      resetForm();
      setShowForm(false);
    } catch (err: any) {
      console.error('Error saving testimonial:', err);
      let message = 'An error occurred while saving the testimonial.';
      try {
        if (err.message && err.message.startsWith('{')) {
          const parsed = JSON.parse(err.message);
          message = `Permission Denied: ${parsed.error}`;
        } else {
          message = err.message || message;
        }
      } catch (e) {
        message = err.message || message;
      }
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const deleteTestimonial = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Testimonial',
      message: 'Are you sure you want to delete this testimonial? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'testimonials', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'testimonials');
        }
      }
    });
  };

  const saveHeroSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUploading(true);
    setError(null);

    try {
      let finalUrl = heroImageUrl;

      if (selectedFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', selectedFile);
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        if (!uploadResponse.ok) throw new Error('Upload failed');
        const { url } = await uploadResponse.json();
        finalUrl = url;
      }

      try {
        await setDoc(doc(db, 'settings', 'hero'), {
          id: 'hero',
          heroImageUrl: finalUrl,
          updatedAt: Date.now()
        });
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.WRITE, 'settings/hero');
      }
      setHeroImageUrl(finalUrl);
      setSelectedFile(null);
      setPreviewUrl('');
      alert('Settings saved successfully!');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      let message = 'Failed to save settings. Please ensure you are logged in as an administrator.';
      
      try {
        if (err.message && err.message.startsWith('{')) {
          const parsed = JSON.parse(err.message);
          message = `Permission Denied: ${parsed.error}. Path: ${parsed.path}`;
        } else {
          message = err.message || message;
        }
      } catch (e) {
        message = err.message || message;
      }
      
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sub: '',
      price: 0,
      category: '',
      emoji: '✨',
      imageUrl: '',
      bgColor: '#f0f0f0',
      accentColor: '#000000',
      isNewArrival: false,
      badge: ''
    });
    setCatFormData({ name: '', label: '' });
    setTestimonialFormData({
      name: '',
      role: 'Verified Buyer',
      content: '',
      rating: 5,
      avatarUrl: '',
      productImageUrl: ''
    });
    setTestimonialFile(null);
    setTestimonialPreview('');
    setAvatarFile(null);
    setAvatarPreview('');
    setSelectedFile(null);
    setPreviewUrl('');
    setIsEditing(null);
    setShowForm(false);
    setError(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-beige/20 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-12 rounded-[3rem] shadow-2xl max-w-md w-full text-center"
        >
          <h2 className="font-serif text-4xl mb-6">Admin Access</h2>
          <p className="text-dark/60 mb-10">Please sign in with your Google account to manage the store.</p>
          <button 
            onClick={handleLogin}
            className="w-full bg-dark text-white py-4 rounded-full font-bold tracking-widest uppercase text-xs hover:bg-gold transition-all"
          >
            Sign In with Google
          </button>
          <button onClick={onBack} className="mt-6 text-dark/40 text-xs uppercase tracking-widest hover:text-dark">
            Back to Store
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-beige/10 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gold/10 flex flex-col p-8">
        <div className="mb-12">
          <h1 className="font-serif text-2xl mb-2">Dashboard</h1>
          <p className="text-[10px] uppercase tracking-widest text-gold">The Beautiful Affair</p>
        </div>

        <nav className="flex-grow space-y-4">
          <button 
            onClick={() => setActiveView('products')}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeView === 'products' ? 'bg-gold text-white shadow-lg' : 'hover:bg-beige/50 text-dark/60'}`}
          >
            <Package size={20} />
            <span className="text-sm font-medium">Products</span>
          </button>
          <button 
            onClick={() => setActiveView('categories')}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeView === 'categories' ? 'bg-gold text-white shadow-lg' : 'hover:bg-beige/50 text-dark/60'}`}
          >
            <Tag size={20} />
            <span className="text-sm font-medium">Categories</span>
          </button>
          <button 
            onClick={() => setActiveView('settings')}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeView === 'settings' ? 'bg-gold text-white shadow-lg' : 'hover:bg-beige/50 text-dark/60'}`}
          >
            <Settings size={20} />
            <span className="text-sm font-medium">Settings</span>
          </button>
          <button 
            onClick={() => setActiveView('testimonials')}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeView === 'testimonials' ? 'bg-gold text-white shadow-lg' : 'hover:bg-beige/50 text-dark/60'}`}
          >
            <MessageSquare size={20} />
            <span className="text-sm font-medium">Testimonials</span>
          </button>
        </nav>

        <div className="pt-8 border-t border-gold/10 space-y-4">
          <button onClick={onBack} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-beige/50 text-dark/60 transition-all">
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Storefront</span>
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-50 text-red-500 transition-all">
            <LogOut size={20} />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-12 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h2 className="font-serif text-4xl capitalize">{activeView}</h2>
            <div className="flex gap-4">
              {activeView !== 'settings' && (
                <button 
                  onClick={() => {
                    resetForm();
                    setShowForm(true);
                  }}
                  className="bg-dark text-white px-8 py-4 rounded-full flex items-center gap-3 hover:bg-gold transition-all shadow-xl active:scale-95"
                >
                  <Plus size={20} />
                  <span className="text-xs uppercase tracking-widest font-bold">
                    Add {activeView === 'products' ? 'Product' : activeView === 'categories' ? 'Category' : 'Testimonial'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {activeView === 'products' ? (
            <div className="space-y-6">
              <div className="hidden md:grid grid-cols-6 gap-4 px-8 py-4 text-[10px] uppercase tracking-widest text-dark/40 font-bold border-b border-gold/10">
                <div className="col-span-2">Product</div>
                <div>Category</div>
                <div>Price</div>
                <div>Status</div>
                <div className="text-right">Actions</div>
              </div>
              <div className="space-y-4">
                {products.map(product => (
                  <div key={product.id} className="bg-white p-4 md:p-6 rounded-[2rem] shadow-sm border border-gold/5 hover:border-gold/20 transition-all group flex flex-col md:grid md:grid-cols-6 md:items-center gap-4 min-h-[100px]">
                    <div className="col-span-2 flex items-center gap-4">
                      <div 
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl overflow-hidden flex-shrink-0"
                        style={{ backgroundColor: product.bgColor }}
                      >
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          product.emoji
                        )}
                      </div>
                      <div>
                        <h3 className="font-serif text-lg leading-tight">{product.name}</h3>
                        <p className="text-[10px] uppercase tracking-widest text-dark/40">{product.sub}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag size={12} className="text-gold" />
                      <span className="text-xs font-medium text-dark/60">{product.category}</span>
                    </div>
                    <div className="text-sm font-bold text-dark">₹{product.price}</div>
                    <div>
                      {product.isNewArrival ? (
                        <span className="text-[9px] uppercase tracking-tighter bg-gold/10 text-gold px-2 py-1 rounded-full font-bold">New Arrival</span>
                      ) : (
                        <span className="text-[9px] uppercase tracking-tighter bg-beige text-dark/40 px-2 py-1 rounded-full font-bold">Standard</span>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => {
                          setFormData(product);
                          setIsEditing(product.id);
                          setShowForm(true);
                        }}
                        className="p-3 bg-beige/50 rounded-full hover:bg-gold hover:text-white transition-all"
                        title="Edit Product"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => deleteProduct(product.id)}
                        className="p-3 bg-beige/50 rounded-full hover:bg-red-500 hover:text-white transition-all"
                        title="Delete Product"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeView === 'categories' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
              {categories.map(cat => (
                <div key={cat.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gold/5 flex items-center justify-between group h-full min-h-[100px]">
                  <div>
                    <h3 className="font-serif text-lg">{cat.label}</h3>
                    <p className="text-[10px] uppercase tracking-widest text-dark/40">{cat.name}</p>
                  </div>
                  <button 
                    onClick={() => deleteCategory(cat.id)}
                    className="p-3 text-dark/20 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          ) : activeView === 'testimonials' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
              {testimonials.map(t => (
                <div key={t.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gold/5 relative group flex flex-col h-full min-h-[350px]">
                  <div className="flex gap-1 mb-4 flex-shrink-0">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={12} className={i < (t.rating || 0) ? "fill-gold text-gold" : "text-dark/10"} />
                    ))}
                  </div>
                  <p className="text-dark/60 text-sm leading-relaxed mb-6 line-clamp-3 italic flex-grow">"{t.content}"</p>
                  
                  {t.productImageUrl && (
                    <div className="mb-6 aspect-video rounded-xl overflow-hidden bg-beige/10 flex-shrink-0">
                      <img src={t.productImageUrl} alt="Product" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-gold/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-beige/20 overflow-hidden">
                        {t.avatarUrl ? (
                          <img src={t.avatarUrl} alt={t.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-dark/20 text-xs font-bold">
                            {t.name?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-serif text-sm">{t.name}</h4>
                        <p className="text-[8px] uppercase tracking-widest text-gold font-bold">{t.role}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setIsEditing(t.id);
                          setTestimonialFormData(t);
                          setShowForm(true);
                        }}
                        className="p-2 text-dark/40 hover:text-gold transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => deleteTestimonial(t.id)}
                        className="p-2 text-dark/40 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="max-w-2xl bg-white p-12 rounded-[3rem] shadow-sm border border-gold/5">
              <h3 className="font-serif text-2xl mb-8">Store Settings</h3>
              <form onSubmit={saveHeroSettings} className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-widest text-dark/40 font-bold">Hero Background Image</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-video bg-beige/20 rounded-3xl border-2 border-dashed border-gold/20 flex flex-col items-center justify-center cursor-pointer hover:bg-beige/30 transition-all overflow-hidden relative group"
                  >
                    {previewUrl || heroImageUrl ? (
                      <>
                        <img 
                          src={previewUrl || heroImageUrl} 
                          alt="Hero Preview" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-dark/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Upload className="text-white" size={24} />
                        </div>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="text-dark/20 mb-2" size={32} />
                        <span className="text-[10px] uppercase tracking-widest text-dark/40">Click to upload hero image</span>
                      </>
                    )}
                  </div>
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
                <button 
                  disabled={isUploading}
                  className="w-full bg-dark text-white py-5 rounded-full font-bold tracking-widest uppercase text-xs hover:bg-gold transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Save Settings
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Modal Form */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="absolute inset-0 bg-dark/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="p-8 md:p-12">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="font-serif text-3xl">
                    {isEditing ? 'Edit' : 'Add'} {activeView === 'products' ? 'Product' : activeView === 'categories' ? 'Category' : 'Testimonial'}
                  </h3>
                  <button onClick={resetForm} className="p-2 hover:text-gold transition-colors"><X size={24} /></button>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 text-red-500 rounded-2xl flex items-center gap-3 text-sm">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                )}

                {activeView === 'products' ? (
                  <form onSubmit={saveProduct} className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-dark/40 font-bold">Product Image</label>
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full aspect-video bg-beige/20 rounded-3xl border-2 border-dashed border-gold/20 flex flex-col items-center justify-center cursor-pointer hover:bg-beige/30 transition-all overflow-hidden relative group"
                      >
                        {previewUrl || formData.imageUrl ? (
                          <>
                            <img 
                              src={previewUrl || formData.imageUrl} 
                              alt="Preview" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-dark/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Upload className="text-white" size={24} />
                            </div>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="text-dark/20 mb-2" size={32} />
                            <span className="text-[10px] uppercase tracking-widest text-dark/40">Click to upload image</span>
                          </>
                        )}
                      </div>
                      <input 
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-dark/40 font-bold">Product Name</label>
                      <input 
                        required
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-beige/20 border-none rounded-2xl p-4 focus:ring-2 focus:ring-gold/20 outline-none"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-dark/40 font-bold">Short Description</label>
                      <input 
                        value={formData.sub}
                        onChange={e => setFormData({...formData, sub: e.target.value})}
                        placeholder="e.g. Silk Satin, 4-inch diameter"
                        className="w-full bg-beige/20 border-none rounded-2xl p-4 focus:ring-2 focus:ring-gold/20 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-dark/40 font-bold">Price (₹)</label>
                      <input 
                        required type="number"
                        value={formData.price}
                        onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                        className="w-full bg-beige/20 border-none rounded-2xl p-4 focus:ring-2 focus:ring-gold/20 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-dark/40 font-bold">Category</label>
                      <select 
                        required
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                        className="w-full bg-beige/20 border-none rounded-2xl p-4 focus:ring-2 focus:ring-gold/20 outline-none"
                      >
                        <option value="">Select Category</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-dark/40 font-bold">Emoji Icon</label>
                      <input 
                        required
                        value={formData.emoji}
                        onChange={e => setFormData({...formData, emoji: e.target.value})}
                        className="w-full bg-beige/20 border-none rounded-2xl p-4 focus:ring-2 focus:ring-gold/20 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-dark/40 font-bold">BG Color (Hex)</label>
                      <input 
                        required
                        value={formData.bgColor}
                        onChange={e => setFormData({...formData, bgColor: e.target.value})}
                        className="w-full bg-beige/20 border-none rounded-2xl p-4 focus:ring-2 focus:ring-gold/20 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-dark/40 font-bold">Accent Color (Hex)</label>
                      <input 
                        required
                        value={formData.accentColor}
                        onChange={e => setFormData({...formData, accentColor: e.target.value})}
                        className="w-full bg-beige/20 border-none rounded-2xl p-4 focus:ring-2 focus:ring-gold/20 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-dark/40 font-bold">Badge (e.g. Sale)</label>
                      <input 
                        value={formData.badge}
                        onChange={e => setFormData({...formData, badge: e.target.value})}
                        className="w-full bg-beige/20 border-none rounded-2xl p-4 focus:ring-2 focus:ring-gold/20 outline-none"
                      />
                    </div>
                    <div className="col-span-2 flex items-center gap-4 py-4">
                      <input 
                        type="checkbox"
                        checked={formData.isNewArrival}
                        onChange={e => setFormData({...formData, isNewArrival: e.target.checked})}
                        className="w-5 h-5 accent-gold"
                      />
                      <label className="text-sm text-dark/60">Mark as New Arrival</label>
                    </div>
                    <button 
                      type="submit"
                      disabled={isUploading}
                      className="col-span-2 bg-dark text-white py-5 rounded-full font-bold tracking-widest uppercase text-xs hover:bg-gold transition-all mt-4 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                      {isEditing ? 'Update Product' : 'Save Product'}
                    </button>
                  </form>
                ) : activeView === 'categories' ? (
                  <form onSubmit={saveCategory} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-dark/40 font-bold">Category Label (e.g. Scrunchies)</label>
                      <input 
                        required
                        value={catFormData.label}
                        onChange={e => setCatFormData({...catFormData, label: e.target.value})}
                        className="w-full bg-beige/20 border-none rounded-2xl p-4 focus:ring-2 focus:ring-gold/20 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-dark/40 font-bold">Category Name (Internal, e.g. scrunchie)</label>
                      <input 
                        required
                        value={catFormData.name}
                        onChange={e => setCatFormData({...catFormData, name: e.target.value})}
                        className="w-full bg-beige/20 border-none rounded-2xl p-4 focus:ring-2 focus:ring-gold/20 outline-none"
                      />
                    </div>
                    <button 
                      type="submit"
                      className="w-full bg-dark text-white py-5 rounded-full font-bold tracking-widest uppercase text-xs hover:bg-gold transition-all mt-4 flex items-center justify-center gap-3"
                    >
                      <Save size={18} />
                      Save Category
                    </button>
                  </form>
                ) : (
                  <form onSubmit={saveTestimonial} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-dark/40 font-bold">Customer Name</label>
                      <input 
                        required
                        value={testimonialFormData.name}
                        onChange={e => setTestimonialFormData({...testimonialFormData, name: e.target.value})}
                        className="w-full bg-beige/20 border-none rounded-2xl p-4 focus:ring-2 focus:ring-gold/20 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-dark/40 font-bold">Role (e.g. Verified Buyer)</label>
                      <input 
                        value={testimonialFormData.role}
                        onChange={e => setTestimonialFormData({...testimonialFormData, role: e.target.value})}
                        className="w-full bg-beige/20 border-none rounded-2xl p-4 focus:ring-2 focus:ring-gold/20 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-dark/40 font-bold">Rating (1-5)</label>
                      <input 
                        required type="number" min="1" max="5"
                        value={testimonialFormData.rating}
                        onChange={e => setTestimonialFormData({...testimonialFormData, rating: Number(e.target.value)})}
                        className="w-full bg-beige/20 border-none rounded-2xl p-4 focus:ring-2 focus:ring-gold/20 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-dark/40 font-bold">Testimonial Content</label>
                      <textarea 
                        required rows={4}
                        value={testimonialFormData.content}
                        onChange={e => setTestimonialFormData({...testimonialFormData, content: e.target.value})}
                        className="w-full bg-beige/20 border-none rounded-2xl p-4 focus:ring-2 focus:ring-gold/20 outline-none resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-dark/40 font-bold">Avatar (Upload)</label>
                      <div className="flex flex-col gap-4">
                        {avatarPreview && (
                          <div className="relative w-20 h-20 rounded-full overflow-hidden bg-beige/10 border border-gold/10">
                            <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => {
                                setAvatarFile(null);
                                setAvatarPreview('');
                              }}
                              className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                        <label className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-beige/20 border-2 border-dashed border-gold/20 rounded-2xl cursor-pointer hover:bg-beige/30 transition-all group">
                          <Upload size={18} className="text-gold group-hover:scale-110 transition-transform" />
                          <span className="text-xs uppercase tracking-widest font-bold text-dark/60">
                            {avatarFile ? 'Change Avatar' : 'Upload Avatar'}
                          </span>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setAvatarFile(file);
                                setAvatarPreview(URL.createObjectURL(file));
                              }
                            }}
                          />
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="h-[1px] flex-grow bg-gold/10"></div>
                          <span className="text-[8px] uppercase tracking-widest text-dark/20 font-bold">or use URL</span>
                          <div className="h-[1px] flex-grow bg-gold/10"></div>
                        </div>
                        <input 
                          placeholder="Avatar URL"
                          value={testimonialFormData.avatarUrl}
                          onChange={e => setTestimonialFormData({...testimonialFormData, avatarUrl: e.target.value})}
                          className="w-full bg-beige/20 border-none rounded-2xl p-4 focus:ring-2 focus:ring-gold/20 outline-none text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-dark/40 font-bold">Product Image (Upload)</label>
                      <div className="flex flex-col gap-4">
                        {testimonialPreview && (
                          <div className="relative aspect-video rounded-2xl overflow-hidden bg-beige/10 border border-gold/10">
                            <img src={testimonialPreview} alt="Preview" className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => {
                                setTestimonialFile(null);
                                setTestimonialPreview('');
                              }}
                              className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm rounded-full text-red-500 hover:bg-white transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                        <label className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-beige/20 border-2 border-dashed border-gold/20 rounded-2xl cursor-pointer hover:bg-beige/30 transition-all group">
                          <Upload size={18} className="text-gold group-hover:scale-110 transition-transform" />
                          <span className="text-xs uppercase tracking-widest font-bold text-dark/60">
                            {testimonialFile ? 'Change Photo' : 'Upload Photo'}
                          </span>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setTestimonialFile(file);
                                setTestimonialPreview(URL.createObjectURL(file));
                              }
                            }}
                          />
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="h-[1px] flex-grow bg-gold/10"></div>
                          <span className="text-[8px] uppercase tracking-widest text-dark/20 font-bold">or use URL</span>
                          <div className="h-[1px] flex-grow bg-gold/10"></div>
                        </div>
                        <input 
                          placeholder="Image URL"
                          value={testimonialFormData.productImageUrl}
                          onChange={e => setTestimonialFormData({...testimonialFormData, productImageUrl: e.target.value})}
                          className="w-full bg-beige/20 border-none rounded-2xl p-4 focus:ring-2 focus:ring-gold/20 outline-none text-sm"
                        />
                      </div>
                    </div>
                    <button 
                      type="submit"
                      disabled={isUploading}
                      className="w-full bg-dark text-white py-5 rounded-full font-bold tracking-widest uppercase text-xs hover:bg-gold disabled:bg-dark/40 disabled:cursor-not-allowed transition-all mt-4 flex items-center justify-center gap-3"
                    >
                      {isUploading ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <Save size={18} />
                      )}
                      {isUploading ? 'Saving...' : (isEditing ? 'Update Testimonial' : 'Save Testimonial')}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-dark/40 backdrop-blur-sm"
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl overflow-hidden"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-2xl">{confirmModal.title}</h3>
              </div>
              
              <p className="text-dark/60 mb-8 leading-relaxed">
                {confirmModal.message}
              </p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-4 rounded-2xl border border-dark/10 font-medium hover:bg-dark/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  }}
                  className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
